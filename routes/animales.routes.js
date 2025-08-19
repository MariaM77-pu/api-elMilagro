// routes/animales.routes.js
const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const multer  = require('multer');
const ctrl    = require('../controllers/animales.controller');

// === Multer: carpeta para fotos ===
const uploadDir = path.join(__dirname, '..', 'uploads', 'animales');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// ===== Caballos de Deporte =====
router.post('/caballos-deporte', upload.single('Foto'), ctrl.createCaballoDeporte);
router.post('/vacas-leche',     upload.single('Foto'), ctrl.createVacaLeche);
router.get("/caballos-deporte", ctrl.getAllCaballosDeporte);
router.get("/vacas-leche", ctrl.getAllVacasLeche);

// ✅ Necesario para tu C#: check de duplicado por Identificacion
router.get('/vacas-leche/:identificacion', ctrl.getVacaByIdentificacion);

module.exports = router;
