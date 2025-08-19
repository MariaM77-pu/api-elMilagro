// utils/priceSigner.js
const crypto = require('crypto');

// Cambia este secreto por uno largo y único
const SECRET = 'MI_SECRETO_LARGO_QUE_NO_ESTA_EN_.ENV_1234567890_!@#$%^&*()';

const ALG = 'sha256';
const SEP = '|';

function signPrice({ item_id, category, precio, ttlSeconds = 600 }) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = [item_id, category, Number(precio).toFixed(2), exp].join(SEP);
  const hmac = crypto.createHmac(ALG, SECRET).update(payload).digest('base64url');
  return { exp, token: hmac };
}

function verifyPrice({ item_id, category, precio, exp, token }) {
  const now = Math.floor(Date.now() / 1000);
  if (!exp || now > Number(exp)) return { ok: false, reason: 'expired' };
  const payload = [item_id, category, Number(precio).toFixed(2), exp].join(SEP);
  const expected = crypto.createHmac(ALG, SECRET).update(payload).digest('base64url');
  const ok = expected.length === (token || '').length &&
             crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token || ''));
  return { ok };
}

module.exports = { signPrice, verifyPrice };
