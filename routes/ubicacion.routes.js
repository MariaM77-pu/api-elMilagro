// routes/ubicacion.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/ubicacion.controller');

// GET /api/ubicacion/paises
router.get('/paises',       ctrl.getPaises);
// GET /api/ubicacion/provincias?paisId=1
router.get('/provincias',   ctrl.getProvinciasByPais);
// GET /api/ubicacion/cantones?provinciaId=1
router.get('/cantones',     ctrl.getCantonesByProvincia);
// GET /api/ubicacion/distritos?cantonId=1
router.get('/distritos',    ctrl.getDistritosByCanton);

module.exports = router;
