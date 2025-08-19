const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/visitasGuiadas.controller');

// Crear nueva visita guiada
router.post('/', ctrl.createVisitaGuiada);

// Listar todas las visitas guiadas
router.get('/', ctrl.getAllVisitasGuiadas);

// (Opcional) Cualquier otra ruta no implementada aquí:
router.all('*', (req, res) => res.status(404).json({ error: 'Ruta no implementada' }));

module.exports = router;
