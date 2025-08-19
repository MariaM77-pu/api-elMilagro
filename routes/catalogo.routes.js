// routes/catalogo.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/catalogo.controller');

router.get('/catalogo', ctrl.listarProductos);

module.exports = router;
