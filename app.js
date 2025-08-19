require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// 🔌 DB (usa el db.js que ya actualizamos a Railway)
const db = require('./db');

// 🛣️ Rutas
const ubicacionRoutes         = require('./routes/ubicacion.routes');
const authRoutes              = require('./routes/auth.routes');
const animalesRoutes          = require('./routes/animales.routes');
const productosLacteosRoutes  = require('./routes/productosLacteos.routes');
const ventaRoutes             = require('./routes/venta.routes');
const compraCitasRoutes       = require('./routes/compraCitas.routes');
const carritoRoutes           = require('./routes/carrito.routes');
const priceRoutes             = require('./routes/price.routes');
const catalogoRoutes          = require('./routes/catalogo.routes');
const onboardingRoutes        = require('./routes/onboarding.routes');
// Si tienes el archivo, también puedes importarlo arriba en vez de inline:
const visitasGuiadasRoutes    = require('./routes/visitasGuiadas.routes');

const app = express();

// 🔧 Middlewares básicos
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));

// 📁 Archivos estáticos (una sola vez)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🧭 Endpoints
app.use('/api/ubicacion',      ubicacionRoutes);
app.use('/api/auth',           authRoutes);
app.use('/api/animales',       animalesRoutes);
app.use('/api/productos-lacteos', productosLacteosRoutes);
app.use('/api/visitas-guiadas', visitasGuiadasRoutes);
app.use('/api/venta',          ventaRoutes);
app.use('/api/compra-citas',   compraCitasRoutes);
app.use('/api',                carritoRoutes);
app.use('/api',                priceRoutes);
app.use('/api/onboarding',     onboardingRoutes);
app.use('/api',                catalogoRoutes);

// 🩺 Healthcheck simple
app.get('/', (req, res) => res.send('API ElMilagro OK'));
app.get('/health', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ status: 'error', db: false, message: e.message });
  }
});

const PORT = process.env.PORT || 3301;
app.listen(PORT, async () => {
  console.log(`🚀 API ElMilagro corriendo en puerto ${PORT}`);
  // Ping de arranque a la DB para ver en logs si conecta bien
  try {
    const [rows] = await db.promise().query('SELECT 1');
    console.log('✅ Conectado a MySQL (Railway)');
  } catch (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
  }
});
