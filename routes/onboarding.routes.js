const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/onboarding.controller');

// Status: ¿mostrar onboarding?
router.get('/status/:usuarioAcceso', ctrl.getStatus);

// Completar: marcar como visto
router.post('/:usuarioAcceso/complete', ctrl.complete);

module.exports = router;
