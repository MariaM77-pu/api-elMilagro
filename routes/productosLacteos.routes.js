// routes/productosLacteos.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/productosLacteos.controller');
const multer  = require('multer');

// Configuración Multer para subir fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/productos/'),
  filename:    (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Rutas para Productos Lácteos
// Crear
router.post('/lacteos', upload.single('FotoArchivo'), ctrl.createProductoLacteo);
// Obtener todos
router.get('/lacteos',                         ctrl.getAllProductosLacteos);

module.exports = router;
