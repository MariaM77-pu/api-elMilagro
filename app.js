require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path    = require('path');



const ubicacionRoutes = require('./routes/ubicacion.routes');
const authRoutes = require('./routes/auth.routes');
const animalesRoutes = require('./routes/animales.routes');
const productosLacteosRoutes = require('./routes/productosLacteos.routes');
//const visitasGuiadasRoutes = require('./routes/visitasGuiadas.routes');
const ventaRoutes = require('./routes/venta.routes');
const compraCitasRoutes = require('./routes/compraCitas.routes');
const carritoRoutes = require('./routes/carrito.routes');
const priceRoutes = require('./routes/price.routes');
const catalogoRoutes = require('./routes/catalogo.routes');
const onboardingRoutes = require('./routes/onboarding.routes');

const app = express();
app.use(cors());
app.use(express.json());


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Después de montar otros routers:
app.use('/api/ubicacion',  ubicacionRoutes);
app.use('/api/auth',       authRoutes);
app.use('/api/animales', animalesRoutes);
app.use('/api/productos-lacteos', productosLacteosRoutes);
app.use('/api/visitas-guiadas', require('./routes/visitasGuiadas.routes'));
app.use('/api/venta', ventaRoutes);
app.use('/api/compra-citas', compraCitasRoutes);
app.use('/api', carritoRoutes);
app.use('/api', priceRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/onboarding', onboardingRoutes);


app.use('/api', catalogoRoutes);

const PORT = process.env.PORT || 3301;
app.listen(PORT, () => {
  console.log(`🚀 API ElMilagro corriendo en puerto ${PORT}`);
});
