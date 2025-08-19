// controllers/visitasGuiadas.controller.js
const db = require('../db');

// 1) Crear nueva visita guiada
// controllers/visitasGuiadas.controller.js
exports.createVisitaGuiada = (req, res) => {
  // 1) Leemos el nuevo campo junto al resto
  const {
    CodigoVisita,
    Fecha,
    HoraInicio,
    Duracion,
    NumeroParticipantes,
    Guia,
    Precio
  } = req.body;

  // 2) Validamos que no falte nada
  const missing = [];
  if (!CodigoVisita)             missing.push('CodigoVisita');
  if (!Fecha)                    missing.push('Fecha');
  if (!HoraInicio)               missing.push('HoraInicio');
  if (!Duracion)                 missing.push('Duracion');
  if (NumeroParticipantes == null) missing.push('NumeroParticipantes');
  if (!Guia)                     missing.push('Guia');
  if (!Precio)              missing.push('Precio');

  if (missing.length) {
    return res
      .status(400)
      .json({ error: 'Faltan campos: ' + missing.join(', ') });
  }

  // 3) Insertamos incluyendo CodigoVisita
  const sql = `
    INSERT INTO VisitasGuiadas
      (CodigoVisita, Fecha, HoraInicio, Duracion,
       NumeroParticipantes, Guia, Precio)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    CodigoVisita,
    Fecha,
    HoraInicio,
    Duracion,
    NumeroParticipantes,
    Guia,
    Precio
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error al crear visita guiada:', err);
      return res
        .status(500)
        .json({ error: 'Error al crear visita guiada' });
    }
    // 4) Devolvemos también el codigo que envió el cliente
    res.status(201).json({
      message: 'Visita guiada registrada',
      id: result.insertId,
      CodigoVisita: CodigoVisita
    });
  });
};


// 2) Obtener todas las visitas guiadas
exports.getAllVisitasGuiadas = (req, res) => {
  const sql = `
    SELECT
      CodigoVisita AS id,
      fecha AS Fecha,
      HoraInicio,
      duracion AS Duracion,
      NumeroParticipantes,
      guia AS Guia,
      Precio AS Precio
    FROM VisitasGuiadas
    ORDER BY fecha DESC, HoraInicio DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al cargar visitas guiadas' });
    res.json(results);
  });
};