// routes/compraCitas.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/compraCitas.controller');

// Citas de Adiestramiento disponibles para compra
router.get('/citas', ctrl.getCitasEnVenta);

module.exports = router;