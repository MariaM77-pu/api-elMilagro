const db = require('../db'); // <- tu createConnection de siempre
const { verifyPrice } = require('../utils/priceSigner');
const { randomUUID } = require('crypto');

const mysql = require('mysql2/promise');
// === Config HTTP al Banco (sin axios) ===
const BANCO_API = process.env.BANCO_API || 'http://localhost:3315/api';
async function postBancoSinpe(payload) {
  const resp = await fetch(`${BANCO_API}/pagos/sinpe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    let data;
    try { data = await resp.json(); } catch { data = { error: `HTTP ${resp.status}` }; }
    const err = new Error(data.error || `HTTP ${resp.status}`);
    err.response = { data };   // para que el catch abajo reporte origen: 'banco'
    throw err;
  }
}

async function getTxConnection() {
  // db.config existe en mysql2 y trae host, user, password, database, port
  const { host, user, password, database, port } = db.config;
  return mysql.createConnection({ host, user, password, database, port });
}

// Helpers de meta
const parseMeta = (m) => {
  if (!m) return null;
  if (typeof m === 'object') return m;
  try { return JSON.parse(m); } catch { return null; }
};
const stringifyMeta = (m) => (m == null ? null : JSON.stringify(m));

// ---- Helpers de SQL usando la MISMA conexión (callbacks -> Promises) ----

// query con params que devuelve "rows"
const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows /*, fields*/) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

// ejecutar un statement sin esperar filas (BEGIN/COMMIT/ROLLBACK/DELETE sin necesidad de rows)
const exec = (sql) =>
  new Promise((resolve, reject) => {
    db.query(sql, (err) => (err ? reject(err) : resolve()));
  });

// ---------------- (Opcional) crear/asegurar carrito ----------------
exports.ensureCart = async (req, res) => {
  try {
    const cart_id = (req.params.cart_id || '').trim()
      || randomUUID().replace(/-/g, '').toUpperCase();
    return res.json({ cart_id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ---------------------- Obtener carrito ----------------------
exports.getCart = async (req, res) => {
  const cart_id = (req.params.cart_id || '').trim();
  if (!cart_id) return res.status(400).json({ error: 'cart_id requerido' });

  try {
    const rows = await q(
      `SELECT id, cart_id, item_id, category, foto, precio, cantidad, meta
         FROM cart_items
        WHERE cart_id = ?
        ORDER BY id DESC`,
      [cart_id]
    );

    const items = rows.map(r => ({
      Id: r.id,
      Cart_Id: r.cart_id,
      Item_Id: r.item_id,
      Category: r.category,
      Foto: r.foto,
      Precio: Number(r.precio),
      Cantidad: Number(r.cantidad),
      Meta: parseMeta(r.meta),
    }));

    const total = items.reduce((acc, it) => acc + (Number(it.Precio) * Number(it.Cantidad)), 0);
    return res.json({ Cart_Id: cart_id, Items: items, Total: Number(total) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ------------------------ Agregar item ------------------------
exports.addItem = async (req, res) => {
  const cart_id = (req.params.cart_id || '').trim();
  if (!cart_id) return res.status(400).json({ error: 'cart_id requerido' });

  let { item_id, category, precio, exp, precio_token, cantidad = 1, foto = null, meta = null } = req.body || {};

  // 🔹 Normaliza category
  category = (category || '').trim().toLowerCase();
  if (item_id == null || !category || precio == null || exp == null || !precio_token) {
    return res.status(400).json({ error: 'Faltan campos requeridos (item_id/category/precio/exp/precio_token)' });
  }

  const v = verifyPrice({ item_id, category, precio, exp, token: precio_token });
  if (!v.ok) return res.status(403).json({ error: 'Precio inválido o expirado' });

  let tconn;
  try {
    tconn = await getTxConnection();
    await tconn.beginTransaction();

    // Asegura existencia del carrito (FK)
    await tconn.execute(
      `INSERT INTO carts (cart_id) VALUES (?)
       ON DUPLICATE KEY UPDATE cart_id = cart_id`,
      [cart_id]
    );

    // Intenta UPSERT: si existe, suma; si no, inserta
    const [rows] = await tconn.execute(
      `SELECT id, cantidad FROM cart_items
        WHERE cart_id = ? AND item_id = ? AND category = ?`,
      [cart_id, item_id, category]
    );

    if (rows.length) {
      const nueva = Number(rows[0].cantidad) + Number(cantidad);
      await tconn.execute(`UPDATE cart_items SET cantidad = ? WHERE id = ?`, [nueva, rows[0].id]);
    } else {
      try {
        await tconn.execute(
          `INSERT INTO cart_items (cart_id, item_id, category, foto, precio, cantidad, meta)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [cart_id, item_id, category, foto, Number(precio), Number(cantidad), stringifyMeta(meta)]
        );
      } catch (e) {
        // Si otro request insertó en paralelo, resolvemos con UPDATE
        if (e && e.code === 'ER_DUP_ENTRY') {
          await tconn.execute(
            `UPDATE cart_items
               SET cantidad = cantidad + ?
             WHERE cart_id = ? AND item_id = ? AND category = ?`,
            [Number(cantidad), cart_id, item_id, category]
          );
        } else {
          throw e;
        }
      }
    }

    await tconn.commit();
    return res.json({ message: 'Item agregado' });

  } catch (e) {
    try { if (tconn) await tconn.rollback(); } catch {}
    return res.status(500).json({ error: e.message });
  } finally {
    try { if (tconn) await tconn.end(); } catch {}
  }
};


// ---------------------- Cambiar cantidad ----------------------
exports.updateQty = async (req, res) => {
  const cart_id = (req.params.cart_id || '').trim();
  const item_id = Number(req.params.item_id);
  const { cantidad, category } = req.body || {};

  if (!cart_id || isNaN(item_id)) return res.status(400).json({ error: 'cart_id e item_id requeridos' });
  if (cantidad == null || Number(cantidad) < 1) return res.status(400).json({ error: 'cantidad inválida' });

  try {
    const r = await q(
      `UPDATE cart_items
          SET cantidad = ?
        WHERE cart_id = ?
          AND item_id = ?
          AND category = ?`,
      [Number(cantidad), cart_id, item_id, category || '']
    );

    // mysql2 con callbacks devuelve "OkPacket" como r; no trae r.affectedRows aquí con nuestro envoltorio
    // Si quieres verificar estrictamente, puedes re-consultar:
    // const chk = await q(`SELECT id FROM cart_items WHERE cart_id=? AND item_id=? AND category=?`, [cart_id, item_id, category || '']);
    // if (!chk.length) return res.status(404).json({ error: 'Item no encontrado' });

    return res.json({ message: 'Cantidad actualizada' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ------------------------ Eliminar item ------------------------
exports.removeItem = async (req, res) => {
  const cart_id = (req.params.cart_id || '').trim();
  const item_id = Number(req.params.item_id);
  const category = (req.query.category || req.body?.category || '').toString();

  if (!cart_id || isNaN(item_id)) return res.status(400).json({ error: 'cart_id e item_id requeridos' });

  try {
    await q(
      `DELETE FROM cart_items
        WHERE cart_id = ?
          AND item_id = ?
          AND (category = ? OR ? = '')`,
      [cart_id, item_id, category, category]
    );
    return res.json({ message: 'Item eliminado' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// ------------------------- Vaciar carrito -------------------------
exports.clearCart = async (req, res) => {
  const cart_id = (req.params.cart_id || '').trim();
  if (!cart_id) return res.status(400).json({ error: 'cart_id requerido' });

  try {
    await q(`DELETE FROM cart_items WHERE cart_id = ?`, [cart_id]);
    return res.json({ message: 'Carrito vaciado' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

// --------------------------- Checkout ---------------------------
exports.checkout = async (req, res) => {
  const cart_id = (req.params.cart_id || '').trim();
  if (!cart_id) return res.status(400).json({ error: 'cart_id requerido' });

  const { metodo_pago, payload, total_esperado } = req.body || {};

  let tconn;
  try {
    tconn = await getTxConnection();
    await tconn.beginTransaction();

    // 1) Ítems + total
    const [rows] = await tconn.execute(
      `SELECT id, item_id, category, foto, precio, cantidad, meta
         FROM cart_items WHERE cart_id = ? FOR UPDATE`,
      [cart_id]
    );
    if (!rows.length) {
      await tconn.rollback();
      return res.status(400).json({ error: 'Carrito vacío' });
    }

    const total = rows.reduce((acc, r) => acc + Number(r.precio) * Number(r.cantidad), 0);

    // 2) Congelar total
    if (total_esperado != null && Number(total_esperado) !== Number(total)) {
      await tconn.rollback();
      return res.status(409).json({ error: 'El total cambió', total_actual: Number(total) });
    }

    // 3) Cobro en Banco (solo aquí)
    if (metodo_pago === 'sinpe') {
      await postBanco('/pagos/sinpe', {
        numero_origen:   payload?.numero_origen,
        numero_destino:  payload?.numero_destino,
        monto:           Number(total),
        descripcion:     payload?.descripcion || null
      });
    } else if (metodo_pago === 'tarjeta') {
      await postBanco('/pagos/tarjeta', {
        identificacion_emisor:   payload?.identificacion_emisor,
        numero_tarjeta_emisor:   payload?.numero_tarjeta_emisor,
        codigo_cvv:              payload?.codigo_cvv,
        fecha_vencimiento:       payload?.fecha_vencimiento,
        numero_tarjeta_receptor: payload?.numero_tarjeta_receptor,
        monto:                   Number(total),
        descripcion:             payload?.descripcion || null
      });
    } else {
      await tconn.rollback();
      return res.status(400).json({ error: 'metodo_pago inválido' });
    }

    // 4) Crear orden
    const [or] = await tconn.execute(
      `INSERT INTO orders (cart_id, metodo_pago, total, created_at)
       VALUES (?, ?, ?, NOW())`,
      [cart_id, metodo_pago || null, Number(total)]
    );
    const order_id = or.insertId;

    // 5) Detalle
    for (const r of rows) {
      await tconn.execute(
        `INSERT INTO order_items (order_id, item_id, category, precio, cantidad, meta)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [order_id, r.item_id, r.category, r.precio, r.cantidad, r.meta]
      );
    }

    // 6) Limpiar carrito
    await tconn.execute(`DELETE FROM cart_items WHERE cart_id = ?`, [cart_id]);

    await tconn.commit();
    return res.json({ message: 'Checkout exitoso', order_id, total: Number(total) });
  } catch (e) {
    try { if (tconn) await tconn.rollback(); } catch {}
    if (e.response?.data) return res.status(400).json({ origen: 'banco', ...e.response.data });
    return res.status(400).json({ origen: 'carrito', error: e.sqlMessage || e.message });
  } finally {
    try { if (tconn) await tconn.end(); } catch {}
  }
};

// Helper HTTP único (usa fetch nativo de Node 18+)
async function postBanco(path, payload) {
  const resp = await fetch(`${BANCO_API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    let data;
    try { data = await resp.json(); } catch { data = { error: `HTTP ${resp.status}` }; }
    const err = new Error(data.error || `HTTP ${resp.status}`);
    err.response = { data };   // preserva forma para el catch
    throw err;
  }
}