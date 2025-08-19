// controllers/productosLacteos.controller.js
const db = require('../db');

// 1) Crear producto lácteo
// controllers/productosLacteos.controller.js

// controllers/productosLacteos.controller.js
exports.createProductoLacteo = (req, res) => {
  const {
    nombre, tipo, CantidadProducida, unidad,
    FechaProduccion, FechaCaducidad, precio, foto: fotoBody
  } = req.body;

  // Si usas multer algún día: toma el archivo subido; si no, toma la ruta enviada por el cliente (C#)
  const foto = req.file
    ? `/uploads/lacteos/${req.file.filename}`   // ajusta esta ruta si usas otra carpeta
    : (fotoBody && String(fotoBody).trim() !== '' ? String(fotoBody).trim() : null);

  const missing = [];
  if (!nombre)            missing.push('nombre');
  if (!tipo)              missing.push('tipo');
  if (!CantidadProducida) missing.push('CantidadProducida');
  if (!unidad)            missing.push('unidad');
  if (!FechaProduccion)   missing.push('FechaProduccion');
  if (!FechaCaducidad)    missing.push('FechaCaducidad');
  if (precio == null)     missing.push('precio');
  if (missing.length) return res.status(400).json({ error: 'Faltan campos: ' + missing.join(', ') });

  const sql = `
    INSERT INTO productoslacteos
      (nombre, tipo, CantidadProducida, unidad, FechaProduccion, FechaCaducidad, precio, foto)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [nombre, tipo, CantidadProducida, unidad, FechaProduccion, FechaCaducidad, precio, foto];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error al crear producto lácteo:', err);
      return res.status(500).json({ error: 'Error al crear producto lácteo' });
    }
    res.status(201).json({ message: 'Producto lácteo registrado', id: result.insertId });
  });
};

// 2) Obtener todos los productos lácteos
exports.getAllProductosLacteos = (req, res) => {
  const sql = `
    SELECT
      Id AS id,
      nombre,
      tipo,
      CantidadProducida AS cantidadProducida,
      unidad,
      FechaProduccion AS fechaProduccion,
      FechaCaducidad AS fechaCaducidad,
      precio,
      foto
    FROM ProductosLacteos
    ORDER BY Id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al cargar productos lácteos' });
    res.json(results);
  });
};
