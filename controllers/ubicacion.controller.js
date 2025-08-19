// controllers/ubicacion.controller.js
const db = require('../db');  // tu conexión mysql2

// 1) Obtener todos los países
exports.getPaises = (req, res) => {
  const sql = 'SELECT PaisId AS paisId, Nombre AS nombre FROM Paises';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al cargar países' });
    res.json(results);
  });
};

// 2) Obtener provincias de un país
exports.getProvinciasByPais = (req, res) => {
  const { paisId } = req.query;
  if (!paisId) return res.status(400).json({ error: 'Debe indicar paisId' });

  const sql = `
    SELECT ProvinciaId AS provinciaId, Nombre AS nombre
      FROM Provincias
     WHERE PaisId = ?
     ORDER BY Nombre
  `;
  db.query(sql, [paisId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al cargar provincias' });
    res.json(results);
  });
};

// 3) Obtener cantones de una provincia
exports.getCantonesByProvincia = (req, res) => {
  const { provinciaId } = req.query;
  if (!provinciaId) return res.status(400).json({ error: 'Debe indicar provinciaId' });

  const sql = `
    SELECT CantonId AS cantonId, Nombre AS nombre
      FROM Cantones
     WHERE ProvinciaId = ?
     ORDER BY Nombre
  `;
  db.query(sql, [provinciaId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al cargar cantones' });
    res.json(results);
  });
};

// 4) Obtener distritos de un cantón
exports.getDistritosByCanton = (req, res) => {
  const { cantonId } = req.query;
  if (!cantonId) return res.status(400).json({ error: 'Debe indicar cantonId' });

  const sql = `
    SELECT DistritoId AS distritoId, Nombre AS nombre
      FROM Distritos
     WHERE CantonId = ?
     ORDER BY Nombre
  `;
  db.query(sql, [cantonId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al cargar distritos' });
    res.json(results);
  });
};
