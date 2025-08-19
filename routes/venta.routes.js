// routes/venta.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/venta.controller');

// Listar vacas en venta
router.get('/vacas',   ctrl.getVacasEnVenta);
// Listar productos lácteos en venta
router.get('/lacteos', ctrl.getLacteosEnVenta);
// Listar visitas guiadas para reserva/compra
router.get('/visitas', ctrl.getVisitasEnVenta);
// Listar caballos en venta
router.get('/caballos', ctrl.getCaballosEnVenta);

module.exports = router;
