/*const mysql = require('mysql2');

const conexion = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'eimilagrodb',
    port: 3309
});

conexion.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});

module.exports = conexion;
*/

// api-elMilagro/db.js
require('dotenv').config();
const mysql = require('mysql2');

// Lee credenciales desde variables de entorno
const cfg = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// SSL opcional (normalmente NO hace falta con el proxy/host interno de Railway)
if ((process.env.DB_SSL || 'false').toLowerCase() === 'true') {
  cfg.ssl = { rejectUnauthorized: false };
}

// Usamos pool (expone query y getConnection)
const pool = mysql.createPool(cfg);

// Expone config para código que hace db.config
pool.config = {
  host: cfg.host,
  user: cfg.user,
  password: cfg.password,
  database: cfg.database,
  port: cfg.port,
};

module.exports = pool;
