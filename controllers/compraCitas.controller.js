// controllers/compraCitas.controller.js
const db = require('../db');

// Obtener citas de adiestramiento disponibles para compra
exports.getCitasEnVenta = (req, res) => {
  const sql = `
    SELECT
      Id                AS Id,
      Fecha             AS Fecha,
      Hora              AS Hora,
      Servicio          AS Servicio,
      Entrenador        AS Entrenador,
      Precio            AS Precio
    FROM CitasAdiestramiento
    ORDER BY Fecha DESC, Hora DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al cargar citas disponibles:', err);
      return res.status(500).json({ error: 'Error al cargar citas disponibles' });
    }
    res.json(results);
  });
};