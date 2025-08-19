// controllers/venta.controller.js
const db = require('../db');

// 1) Vacas en venta (Animal + VacasLeche)
exports.getVacasEnVenta = (req, res) => {
  const sql = `
    SELECT a.Id                AS id,
           a.Raza              AS raza,
           TIMESTAMPDIFF(YEAR, a.FechaNacimiento, CURDATE()) AS edad,
           v.Precio  AS Precio,
           a.Foto              AS fotoUrl
      FROM Animal a
 JOIN VacasLeche v ON v.id_animal = a.Id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al cargar vacas en venta' });
    res.json(results);
  });
};

// 2) Productos lácteos en venta
exports.getLacteosEnVenta = (req, res) => {
  const sql = `
    SELECT
      Id AS Id,
      nombre AS Nombre,
      tipo AS Tipo,
      Precio AS Precio,
      foto AS Foto
    FROM ProductosLacteos
    ORDER BY nombre
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al cargar productos lácteos' });
    res.json(results);
  });
};
// 3) Visitas guiadas disponibles para reserva
exports.getVisitasEnVenta = (req, res) => {
  const sql = `
    SELECT
      CodigoVisita        AS CodigoVisita,
      fecha               AS Fecha,
      HoraInicio          AS HoraInicio,
      duracion            AS Duracion,
      NumeroParticipantes AS NumeroParticipantes,
      guia                AS Guia,
      Precio         AS Precio
    FROM VisitasGuiadas
    ORDER BY Fecha DESC, HoraInicio DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al cargar visitas guiadas' });
    res.json(results);
  });
};

// 4) Caballos en venta (Animal + CaballoDeporte)
exports.getCaballosEnVenta = (req, res) => {
  const sql = `
    SELECT
      a.Id AS Id,
      a.Raza AS Raza,
      TIMESTAMPDIFF(YEAR, a.FechaNacimiento, CURDATE()) AS Edad,
      COALESCE(c.Precio, 0) AS Precio,
      a.Foto AS FotoUrl
    FROM Animal a
    JOIN CaballoDeporte c ON c.id_animal = a.Id
    ORDER BY a.Raza
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al cargar caballos en venta' });
    res.json(results);
  });
};