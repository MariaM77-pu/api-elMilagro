// controllers/catalogo.controller.js
const { signPrice } = require('../utils/priceSigner');

exports.listarProductos = async (req, res) => {
  // Lista base (puede venir de JSON, memoria, etc. sin tocar BD)
  const productos = [
    { item_id: 101, category: 'lacteos', nombre: 'Leche entera',  precio: 1200.00, foto: null },
    { item_id: 102, category: 'lacteos', nombre: 'Queso fresco',  precio: 2200.00, foto: null },
    { item_id: 201, category: 'visita',   nombre: 'Visita guiada', precio: 8500.00, foto: null },
  ];

  const items = productos.map(p => {
    const { exp, token } = signPrice({
      item_id: p.item_id,
      category: p.category,
      precio: p.precio,
      ttlSeconds: 600, // 10 minutos
    });
    return { ...p, exp, precio_token: token };
  });

  res.json({ items });
};
