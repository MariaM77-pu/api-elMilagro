// routes/carrito.routes.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/carrito.controller');

// Helper: si algún handler no existe, responde 501 para detectar faltantes
const h = (name) =>
  (typeof c[name] === 'function'
    ? c[name]
    : (req, res) => res.status(501).json({ error: `Handler '${name}' no implementado` }));

// (Opcional) crear/asegurar un cart_id
// POST /api/cart/ensure                -> { cart_id }
// POST /api/cart/ensure/:cart_id       -> { cart_id } (devuelve el mismo si viene)
router.post('/cart/ensure/:cart_id?', h('ensureCart'));

// Obtener carrito actual por id
// GET /api/cart/:cart_id               -> { Cart_Id, Items[], Total }
router.get('/cart/:cart_id', h('getCart'));

// Agregar item al carrito
// POST /api/cart/:cart_id/items        -> body: { item_id, category, precio, exp, precio_token, cantidad?, foto?, meta? }
router.post('/cart/:cart_id/items', h('addItem'));

// Cambiar cantidad de un item
// PATCH /api/cart/:cart_id/items/:item_id -> body: { cantidad, category }
router.patch('/cart/:cart_id/items/:item_id', h('updateQty'));

// Eliminar un item concreto
// DELETE /api/cart/:cart_id/items/:item_id  (category por query ?category= o en body {category})
router.delete('/cart/:cart_id/items/:item_id', h('removeItem'));

// Vaciar todo el carrito
// DELETE /api/cart/:cart_id/items
router.delete('/cart/:cart_id/items', h('clearCart'));

// Checkout (crear orden + detalle y vaciar carrito)
// POST /api/cart/:cart_id/checkout     -> body: { metodo_pago?, payload?, total_esperado? }
router.post('/cart/:cart_id/checkout', h('checkout'));

module.exports = router;
