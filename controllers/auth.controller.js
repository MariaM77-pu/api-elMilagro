// controllers/auth.controller.js
const db         = require('../db');
const bcrypt     = require('bcrypt');
const speakeasy  = require('speakeasy');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const MAX_INTENTOS = parseInt(process.env.MAX_INTENTOS || '5', 10);
require('dotenv').config();
const nodemailer = require('nodemailer');

exports.buscarPorCorreo = (req, res) => {
  const correo = req.params.correo.trim().toLowerCase();

  console.log('🔍 Buscando usuario con correo:', correo);

  const sql = 'SELECT Correo FROM usuarios WHERE Correo = ?';
  db.query(sql, [correo], (err, results) => {
    if (err) {
      console.error('❌ Error al ejecutar consulta:', err);
      return res.status(500).json({ error: 'Error en el servidor al buscar el correo' });
    }

    if (results.length > 0) {
      // Si encontró al menos una fila, devolvemos el correo
      return res.json({ message: results[0].Correo });
    } else {
      // No hay resultados: correo no registrado
      return res.status(200).json({ message: 'No existe' });
    }
  });
};


// 1) Login
exports.login = (req, res) => {
  let { usuarioAcceso, clave } = req.body;
  if (!usuarioAcceso || !clave) {
    return res.status(400).json({ error: 'usuarioAcceso y clave son requeridos' });
  }
  usuarioAcceso = String(usuarioAcceso).trim().toLowerCase();

  const sqlSel = `
    SELECT Id, UsuarioAcceso, Correo, TipoUsuario, ClaveHash, IntentosFallidos, Bloqueado
    FROM Usuarios
    WHERE UsuarioAcceso = ? OR Correo = ?
    LIMIT 1
  `;
  db.query(sqlSel, [usuarioAcceso, usuarioAcceso], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al consultar usuario' });
    if (!rows.length) return res.status(401).json({ error: 'Usuario o clave incorrecto', intentosFallidos: 0, maxIntentos: MAX_INTENTOS });

    const u = rows[0];

    if (u.Bloqueado) {
      return res.status(423).json({ error: `Cuenta bloqueada. Resuelva el desafío.`, bloqueado: true, maxIntentos: MAX_INTENTOS });
    }

    const ok = bcrypt.compareSync(clave, u.ClaveHash);
    if (!ok) {
      const nuevosIntentos = (u.IntentosFallidos || 0) + 1;
      const seBloquea = nuevosIntentos >= MAX_INTENTOS;
      const sqlUp = seBloquea
        ? `UPDATE Usuarios SET IntentosFallidos = 0, Bloqueado = 1 WHERE Id = ?`
        : `UPDATE Usuarios SET IntentosFallidos = ? WHERE Id = ?`;

      db.query(sqlUp, seBloquea ? [u.Id] : [nuevosIntentos, u.Id], (err2) => {
        if (err2) return res.status(500).json({ error: 'Error al actualizar intentos' });
        if (seBloquea) {
          return res.status(423).json({ error: `Cuenta bloqueada tras ${MAX_INTENTOS} intentos.`, bloqueado: true, maxIntentos: MAX_INTENTOS });
        }
        return res.status(401).json({ error: 'Usuario o clave incorrecto', intentosFallidos: nuevosIntentos, maxIntentos: MAX_INTENTOS });
      });
      return;
    }

    // éxito → reset intentos
    const sqlReset = `UPDATE Usuarios SET IntentosFallidos = 0 WHERE Id = ?`;
    db.query(sqlReset, [u.Id], (err3) => {
      if (err3) return res.status(500).json({ error: 'Error al actualizar usuario' });
      const token = jwt.sign({ userId: u.Id }, JWT_SECRET, { expiresIn: '2h' });
      return res.json({ token }); // TIPO/ROL lo obtendrás con /auth/me tras 2FA
    });
  });
};
exports.me = (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });
  const raw = auth.split(' ')[1];
  let payload;
  try { payload = jwt.verify(raw, JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Token inválido' }); }

  const sql = `SELECT Id, UsuarioAcceso, Correo, TipoUsuario, Bloqueado, IntentosFallidos FROM Usuarios WHERE Id = ?`;
  db.query(sql, [payload.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al consultar perfil' });
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const u = rows[0];
    res.json({
      Id: u.Id,
      UsuarioAcceso: u.UsuarioAcceso,
      Correo: u.Correo,
      TipoUsuario: u.TipoUsuario,
      Bloqueado: !!u.Bloqueado,
      IntentosFallidos: u.IntentosFallidos ?? 0
    });
  });
};

exports.sendEmailTokenSimple = (req, res) => {
  const { usuarioAcceso } = req.body || {};
  if (!usuarioAcceso) {
    return res.status(400).json({ error: 'usuarioAcceso requerido' });
  }

  const sqlUser = `
    SELECT Correo
    FROM Usuarios
    WHERE UsuarioAcceso = ? OR Correo = ?
    LIMIT 1
  `;

  db.query(sqlUser, [usuarioAcceso, usuarioAcceso], (err, rows) => {
    if (err) {
      console.error('Error al obtener correo:', err);
      return res.status(500).json({ error: 'Error al obtener correo' });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const correo = rows[0].Correo;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const sqlInsert = `
      INSERT INTO EmailVerifications (UsuarioAcceso, Token, Expiration)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))
      ON DUPLICATE KEY UPDATE
        Token = VALUES(Token),
        Expiration = VALUES(Expiration),
        ActualizadoEn = NOW()
    `;

    db.query(sqlInsert, [usuarioAcceso, code], (err2) => {
      if (err2) {
        console.error('Error al generar token de email:', err2);
        return res.status(500).json({ error: 'Error al generar token de email' });
      }
      console.log('MAIL_DEV:', process.env.MAIL_DEV);
      console.log('SMTP_USER:', process.env.SMTP_USER, 'HOST:', process.env.SMTP_HOST, 'PORT:', process.env.SMTP_PORT);


      // Modo desarrollo: no envía correo real, devuelve/loguea el token
      if (process.env.MAIL_DEV === 'true') {
        console.log(`[DEV] Token para ${usuarioAcceso} (${correo}): ${code}`);
        return res.json({ ok: true, token: code });
      }

      // Transporter SMTP desde .env
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true', // true=465 SSL, false=587 STARTTLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 15000,
      });

      // Usamos una IIFE async para poder usar await dentro del callback
      (async () => {
        try {
          const ok = await transporter.verify();
          console.log('SMTP verify:', ok);
        } catch (e) {
          console.error('SMTP verify ERROR:', e);
          return res.status(500).json({ error: 'Fallo conexión SMTP', detail: e.message });
        }

        try {
          const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: correo,
            subject: 'Código de Verificación - ElMilagro',
            text: `Su código de verificación es: ${code}`,
          });

          console.log('Correo enviado:', info.messageId, info.response);
          return res.json({ ok: true, message: 'Token de verificación enviado al correo' });
        } catch (e) {
          console.error('Error al enviar email:', e);
          return res.status(500).json({ error: 'Error al enviar token de verificación', detail: e.message });
        }
      })();
    });
  });
};


exports.desafioPreguntas = (req, res) => {
  const { usuarioAcceso, respuestas } = req.body;
  if (!usuarioAcceso || !Array.isArray(respuestas) || !respuestas.length) {
    return res.status(400).json({ error: 'usuarioAcceso y respuestas son requeridos' });
  }

  const sql = `
    SELECT Id, RespuestaHash1, RespuestaHash2, RespuestaHash3
    FROM Usuarios
    WHERE UsuarioAcceso = ? OR Correo = ?
    LIMIT 1
  `;
  db.query(sql, [usuarioAcceso, usuarioAcceso], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al consultar usuario' });
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const u = rows[0];

    // Normaliza respuestas (en el orden de tus preguntas reales; si tus preguntas vienen con IDs 1-3 fijos, ajusta este mapeo)
    // Aquí se asume que preguntaId 1→R1, 2→R2, 3→R3 (ajústalo a tu mapping real)
    let okCount = 0;
    for (const r of respuestas) {
      const txt = String(r.respuesta || '').trim().toLowerCase();
      if (!txt) continue;

      if (r.preguntaId === 1 && u.RespuestaHash1 && bcrypt.compareSync(txt, u.RespuestaHash1)) okCount++;
      if (r.preguntaId === 2 && u.RespuestaHash2 && bcrypt.compareSync(txt, u.RespuestaHash2)) okCount++;
      if (r.preguntaId === 3 && u.RespuestaHash3 && bcrypt.compareSync(txt, u.RespuestaHash3)) okCount++;
    }

    if (okCount < 2) { // por ejemplo, exige 2/3 correctas (ajusta tu regla)
      return res.status(401).json({ error: 'Respuestas incorrectas' });
    }

    const up = `UPDATE Usuarios SET Bloqueado = 0, IntentosFallidos = 0 WHERE Id = ?`;
    db.query(up, [u.Id], (err2) => {
      if (err2) return res.status(500).json({ error: 'Error al desbloquear' });
      return res.json({ ok: true, message: 'Cuenta desbloqueada' });
    });
  });
};


// 1) Obtener preguntas de seguridad
exports.getSecurityQuestions = (req, res) => {
  const sql = 'SELECT PreguntaId AS preguntaId, Texto AS texto FROM PreguntasSeguridad ORDER BY PreguntaId';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al cargar preguntas de seguridad' });
    res.json(results);
  });
};

// 2) Registro de usuario
exports.registerUser = async (req, res) => {
  const {
    Identificacion, NombreCompleto, Telefono, Correo, TipoUsuario,
    UsuarioAcceso, Clave, Respuesta1, Respuesta2, Respuesta3,
    PaisId, ProvinciaId, CantonId, DistritoId
  } = req.body;

  // Validar campos obligatorios
  const missingFields = [];
  if (!Identificacion)    missingFields.push('Identificacion');
  if (!NombreCompleto)    missingFields.push('NombreCompleto');
  if (!Correo)            missingFields.push('Correo');
  if (!UsuarioAcceso)     missingFields.push('UsuarioAcceso');
  if (!Clave)             missingFields.push('Clave');
  if (!Respuesta1)        missingFields.push('Respuesta1');
  if (!Respuesta2)        missingFields.push('Respuesta2');
  if (!Respuesta3)        missingFields.push('Respuesta3');
  if (!PaisId)            missingFields.push('PaisId');
  if (!ProvinciaId)       missingFields.push('ProvinciaId');
  if (!CantonId)          missingFields.push('CantonId');
  if (!DistritoId)        missingFields.push('DistritoId');

  if (missingFields.length) {
    return res.status(400).json({ error: 'Faltan campos: ' + missingFields.join(', ') });
  }

  try {
    // Hashear contraseña
    const saltRounds = 10;
    const claveHash  = await bcrypt.hash(Clave, saltRounds);

    // Generar TOTP secret para 2FA
    const totpSecret = speakeasy.generateSecret({ length: 20 }).base32;

    // Insertar nuevo usuario
    const sql = `
      INSERT INTO Usuarios (
        Identificacion, NombreCompleto, Telefono, Correo, TipoUsuario,
        UsuarioAcceso, ClaveHash, IntentosFallidos, Bloqueado,
        TotpSecret, RespuestaHash1, RespuestaHash2, RespuestaHash3,
        PaisId, ProvinciaId, CantonId, DistritoId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      Identificacion, NombreCompleto, Telefono, Correo, TipoUsuario,
      UsuarioAcceso, claveHash, totpSecret,
      Respuesta1, Respuesta2, Respuesta3,
      PaisId, ProvinciaId, CantonId, DistritoId
    ];

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error('Error al registrar usuario:', err);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        message: 'Usuario registrado correctamente',
        usuarioId: result.insertId
      });
    });
  } catch (error) {
    console.error('Error interno:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 3) Logout
exports.logout = (req, res) => { res.json({ message: 'Sesión cerrada' }); };

// 4) Cambiar contraseña
exports.changePassword = (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });
  const token = auth.split(' ')[1];
  let payload;
  try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: 'Token inválido' }); }
  const userId = payload.userId;
  const { NewPassword, ConfirmPassword } = req.body;
  if (!NewPassword || !ConfirmPassword) return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (NewPassword !== ConfirmPassword) return res.status(400).json({ error: 'Las claves no coinciden' });
  bcrypt.hash(NewPassword, 10, (err, hash) => {
    if (err) return res.status(500).json({ error: 'Error al encriptar clave' });
    db.query('UPDATE Usuarios SET ClaveHash = ? WHERE Id = ?', [hash, userId], (err) => {
      if (err) return res.status(500).json({ error: 'Error al cambiar clave' });
      const histSql = `INSERT INTO PasswordHistories (UsuarioId, ClaveHash, FechaCambio) VALUES (?, ?, NOW())`;
      db.query(histSql, [userId, hash], () => {});
      res.json({ message: 'Clave cambiada correctamente' });
    });
  });
};

// controllers/auth.controller.js

exports.getChallengeQuestions = (req, res) => {
  const usuarioAcceso = req.params.usuarioAcceso;
  if (!usuarioAcceso) {
    return res.status(400).json({ error: 'UsuarioAcceso es requerido' });
  }

  // 1) Traer los hashes del usuario
  const sqlUser = `
    SELECT 
      Id, 
      RespuestaHash1, 
      RespuestaHash2, 
      RespuestaHash3
    FROM Usuarios
    WHERE UsuarioAcceso = ?
  `;
  db.query(sqlUser, [usuarioAcceso], (err, users) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al buscar usuario' });
    }
    if (!users.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { RespuestaHash1, RespuestaHash2, RespuestaHash3 } = users[0];
    const hashes = [RespuestaHash1, RespuestaHash2, RespuestaHash3];

    // 2) Traer las primeras 3 preguntas en orden
    const sqlPreguntas = `
      SELECT PreguntaId, Texto
      FROM preguntasseguridad
      ORDER BY PreguntaId
      LIMIT 3
    `;
    db.query(sqlPreguntas, (err2, questions) => {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ error: 'Error al cargar preguntas' });
      }

      // 3) Combinar preguntas con sus hashes respectivos
      const response = questions.map((q, i) => ({
        PreguntaId: q.PreguntaId,
        Texto:      q.Texto,
        Hash:       hashes[i] || null
      }));

      return res.json(response);
    });
  });
};


// 6) Reto de seguridad: verificar respuestas
exports.verifyChallengeAnswers = (req, res) => {
  const { usuarioAcceso, Respuesta1, Respuesta2, Respuesta3 } = req.body;
  if (!usuarioAcceso || !Respuesta1 || !Respuesta2 || !Respuesta3) return res.status(400).json({ error: 'Todos los campos son requeridos' });
  db.query('SELECT Id FROM Usuarios WHERE UsuarioAcceso = ?', [usuarioAcceso], (err, users) => {
    if (err) return res.status(500).json({ error: 'Error al buscar usuario' });
    if (!users.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const userId = users[0].Id;
    const sql = 'SELECT Respuesta FROM UsuarioRespuestas WHERE UsuarioId = ? ORDER BY RespuestaId LIMIT 3';
    db.query(sql, [userId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Error al cargar respuestas' });
      const actual = rows.map(r => r.Respuesta.toLowerCase().trim());
      const provided = [Respuesta1, Respuesta2, Respuesta3].map(r => r.toLowerCase().trim());
      if (!provided.every((r, i) => r === actual[i])) return res.status(401).json({ error: 'Respuestas incorrectas' });
      db.query('UPDATE Usuarios SET Bloqueado = 0, IntentosFallidos = 0 WHERE Id = ?', [userId], (err) => {
        if (err) return res.status(500).json({ error: 'Error al desbloquear usuario' });
        res.json({ message: 'Cuenta desbloqueada exitosamente' });
      });
    });
  });
};

// 7) TOTP setup: generar QR
exports.getTotpSetup = (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });
  let payload;
  try { payload = jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return res.status(401).json({ error: 'Token inválido' }); }
  const userId = payload.userId;
  const secret = speakeasy.generateSecret({ length: 20, name: `ElMilagro:${userId}` });
  db.query('UPDATE Usuarios SET TotpSecret = ? WHERE Id = ?', [secret.base32, userId], (err) => {
    if (err) return res.status(500).json({ error: 'Error al guardar secreto TOTP' });
    QRCode.toDataURL(secret.otpauth_url, (err2, dataUrl) => {
      if (err2) return res.status(500).json({ error: 'Error al generar QR' });
      res.json({ qrUrl: dataUrl });
    });
  });
};

// 8) TOTP verify: validar código
exports.verifyTotp = (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido' });
  let payload;
  try { payload = jwt.verify(auth.split(' ')[1], JWT_SECRET); } catch { return res.status(401).json({ error: 'Token inválido' }); }
  const userId = payload.userId;
  const { codigo } = req.body;
  if (!codigo) return res.status(400).json({ error: 'Código requerido' });
  db.query('SELECT TotpSecret FROM Usuarios WHERE Id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al buscar secreto TOTP' });
    if (!results.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const secret = results[0].TotpSecret;
    const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: codigo, window: 1 });
    if (!valid) return res.status(401).json({ error: 'Código incorrecto' });
    res.json({ message: 'TOTP verificado' });
  });
};

// 9) Envío de token de verificación por correo electrónico
exports.sendEmailToken = (req, res) => { 
  const { usuarioAcceso, Correo } = req.body;
  if (!usuarioAcceso || !Correo) {
    return res.status(400).json({ error: 'usuarioAcceso y Correo son requeridos' });
  }

  // 🔧 Normalizar (evita fallos por mayúsculas/espacios)
  const ua = String(usuarioAcceso).trim().toLowerCase();
  const correoDestino = String(Correo).trim(); // puedes lowerCase si tu lógica lo requiere

  // Generar código aleatorio de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Guardar o actualizar con expiración en 15 minutos (servidor)
  const sqlInsert = `
    INSERT INTO EmailVerifications (UsuarioAcceso, Token, Expiration)
    VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))
    ON DUPLICATE KEY UPDATE
      Token = VALUES(Token),
      Expiration = VALUES(Expiration),
      ActualizadoEn = NOW()
  `;

  db.query(sqlInsert, [ua, code], (err) => {
    if (err) {
      console.error('Error al crear token de email:', err);
      return res.status(500).json({ error: 'Error al enviar token de verificación' });
    }

    // Modo desarrollo: no envía correo real, devuelve/loguea el token
    if (process.env.MAIL_DEV === 'true') {
      console.log(`[DEV] Token para ${ua} (${correoDestino}): ${code}`);
      return res.json({ ok: true, token: code });
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true', // true=465 (SSL), false=587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''), // quita espacios por si copiaste el app password con espacios
      },
      connectionTimeout: 15000,
    });

    (async () => {
      try {
        const ok = await transporter.verify();
        console.log('SMTP verify:', ok);
      } catch (e) {
        console.error('SMTP verify ERROR:', e);
        return res.status(500).json({ error: 'Fallo conexión SMTP', detail: e.message });
      }

      try {
        const info = await transporter.sendMail({
          from: process.env.MAIL_FROM || process.env.SMTP_USER,
          to: correoDestino,
          subject: 'Código de Verificación - ElMilagro',
          text: `Su código de verificación es: ${code}`,
        });

        console.log('Correo enviado:', info.messageId, info.response);
        return res.json({ ok: true, message: 'Token de verificación enviado al correo' });
      } catch (e) {
        console.error('Error al enviar email:', e);
        return res.status(500).json({ error: 'Error al enviar token de verificación', detail: e.message });
      }
    })();
  });
};


// 10) Verificar token de correo y desbloquear cuenta
exports.verifyEmailToken = (req, res) => {
  // Acepta 'Token' o 'token' por si el cliente serializa en camelCase
  const usuarioAcceso = req.body.usuarioAcceso;
  const TokenRaw = req.body.Token ?? req.body.token;
  

  if (!usuarioAcceso || !TokenRaw) {
    return res.status(400).json({ error: 'usuarioAcceso y Token son requeridos' });
  }

  const ua = String(usuarioAcceso).trim().toLowerCase();
  const token = String(TokenRaw).trim();

  // 1) Que tenga 6 dígitos
  if (!/^\d{6}$/.test(token)) {
    return res.status(400).json({ error: 'Formato de token inválido' });
  }

  // 2) Valida expiración en la BD (evita problemas de timezone)
  const sql = `
    SELECT Token
      FROM EmailVerifications
     WHERE UsuarioAcceso = ?
       AND Expiration >= NOW()
     LIMIT 1
  `;
  db.query(sql, [ua], (err, results) => {
    if (err) {
      console.error('Error al leer token de verificación:', err);
      return res.status(500).json({ error: 'Error al leer token de verificación' });
    }
    if (!results.length) {
      return res.status(401).json({ error: 'Token expirado o no generado' });
    }

      // 🔍 Logs para depuración
    console.log('VERIF UA:', ua, 'INPUT TOKEN:', token);
    console.log('DB TOKEN:', results[0]?.Token);
    
    const stored = String(results[0].Token).trim();
    if (stored !== token) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // 3) Desbloquea / limpia intentos y puedes borrar el token si quieres
    const up1 = `UPDATE Usuarios SET Bloqueado = 0, IntentosFallidos = 0 WHERE UsuarioAcceso = ?`;
    db.query(up1, [ua], (err2) => {
      if (err2) return res.status(500).json({ error: 'Error al desbloquear usuario' });

      // Opcional: invalidar el token usado
      db.query('DELETE FROM EmailVerifications WHERE UsuarioAcceso = ?', [ua], () => {});
      return res.json({ ok: true, message: 'Código verificado' });
    });
  });
};
