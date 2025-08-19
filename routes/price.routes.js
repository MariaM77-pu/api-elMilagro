// routes/price.routes.js
const express = require('express');
const router = express.Router();
const { signPrice } = require('../utils/priceSigner');

// Firmar el precio de un item (para evitar manipulación en el FE)
// POST /api/price/sign -> body: { item_id, category, precio, ttlSeconds? }
// Respuesta: { exp, precio_token }
router.post('/price/sign', (req, res) => {
  try {
    const { item_id, category, precio, ttlSeconds } = req.body || {};
    if (item_id == null || !category || precio == null) {
      return res.status(400).json({ error: 'Faltan item_id, category o precio' });
    }
    const { exp, token } = signPrice({ item_id, category, precio, ttlSeconds });
    return res.json({ exp, precio_token: token });
  } catch (e) {
    console.error('[price/sign]', e);
    return res.status(500).json({ error: 'Error al firmar precio' });
  }
});

module.exports = router;
