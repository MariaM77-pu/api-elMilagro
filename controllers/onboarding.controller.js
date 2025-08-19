const db = require('../db');

// Config: define aquí tus imágenes por rol (rutas que servirá tu MVC desde wwwroot)
const SLIDES_BY_ROLE = {
  Trabajador: [
    "/imagenes/trabajador1.png",
    "/imagenes/trabajador2.png",
    "/imagenes/trabajador3.png"
  ],
  Cliente: [
    "/imagenes/cliente1.png",
    "/imagenes/cliente2.png",
    "/imagenes/cliente3.png"
  ]
};

function normalizeRole(roleRaw) {
  const r = (roleRaw || '').trim().toLowerCase();
  if (r === 'trabajador') return 'Trabajador';
  if (r === 'cliente') return 'Cliente';
  return 'Cliente'; // default
}

exports.getStatus = (req, res) => {
  const usuarioAcceso = (req.params.usuarioAcceso || '').trim().toLowerCase();
  const role = normalizeRole(req.query.role);

  if (!usuarioAcceso) {
    return res.status(400).json({ error: 'usuarioAcceso es requerido' });
  }

  const sql = 'SELECT 1 FROM onboarding_usuarios WHERE usuario_acceso = ? LIMIT 1';
  db.query(sql, [usuarioAcceso], (err, rows) => {
    if (err) {
      console.error('❌ Error getStatus:', err);
      return res.status(500).json({ error: 'Error en base de datos' });
    }

    const alreadySeen = rows && rows.length > 0;
    const slides = SLIDES_BY_ROLE[role] || SLIDES_BY_ROLE.Cliente;

    return res.json({
      shouldShow: !alreadySeen,
      variant: role,   // "Trabajador" | "Cliente"
      slides          // arreglo de strings (rutas absolutas que usará el MVC)
    });
  });
};

exports.complete = (req, res) => {
  const usuarioAcceso = (req.params.usuarioAcceso || '').trim().toLowerCase();
  if (!usuarioAcceso) {
    return res.status(400).json({ error: 'usuarioAcceso es requerido' });
  }

  const sql = `
    INSERT INTO onboarding_usuarios (usuario_acceso)
    VALUES (?)
    ON DUPLICATE KEY UPDATE visto_en = VALUES(visto_en)
  `;
  db.query(sql, [usuarioAcceso], (err) => {
    if (err) {
      console.error('❌ Error complete:', err);
      return res.status(500).json({ error: 'Error en base de datos' });
    }
    return res.status(204).send();
  });
};
