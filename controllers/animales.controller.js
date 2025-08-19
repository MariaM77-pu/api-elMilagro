// controllers/animales.controller.js
const db = require('../db');

// Crear nuevo Caballo de Deporte (y tabla Animal)
// controllers/animales.controller.js (o donde tengas createCaballoDeporte)
exports.createCaballoDeporte = (req, res) => {
  const {
    Identificacion, Raza, Sexo, FechaNacimiento,
    HistorialVeterinario, Precio,
    Disciplina, HistorialCompetencias
  } = req.body;

  // ✅ tomar archivo si viene por multer, si no tomar ruta enviada en el body
  let foto = null;
  if (req.file && req.file.filename) {
    foto = `/uploads/animales/${req.file.filename}`;   // servible por express.static('/uploads', ...)
  } else if (req.body.Foto && String(req.body.Foto).trim() !== '') {
    foto = String(req.body.Foto).trim();
  } else if (req.body.foto && String(req.body.foto).trim() !== '') {
    foto = String(req.body.foto).trim();
  }

  const precioNum = (Precio !== undefined && Precio !== null && Precio !== '') ? Number(Precio) : null;
  if (!Identificacion || !Raza || !Sexo || !FechaNacimiento || !Disciplina || precioNum == null) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const sqlAnimal = `
    INSERT INTO Animal
    (Identificacion, Raza, Sexo, FechaNacimiento, HistorialVeterinario, Precio, Foto)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const paramsAnimal = [
    (Identificacion || '').trim(),
    (Raza || '').trim(),
    (Sexo || '').trim(),
    (FechaNacimiento || '').trim(),
    HistorialVeterinario || null,
    precioNum,
    foto
  ];

  db.query(sqlAnimal, paramsAnimal, (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al crear Animal' });

    const animalId = result.insertId;
    const sqlCaballo = `
      INSERT INTO CaballoDeporte (id_animal, Disciplina, HistorialCompetencias)
      VALUES (?, ?, ?)
    `;
    db.query(sqlCaballo, [animalId, (Disciplina || '').trim(), HistorialCompetencias || null], (err2) => {
      if (err2) return res.status(500).json({ error: 'Error al crear CaballoDeporte' });
      res.status(201).json({ message: 'Caballo registrado correctamente', id: animalId });
    });
  });
};


// Obtener Caballo y detalles
// controllers/animales.controller.js



// --- Vaca de Leche ---
// controllers/animales.controller.js
exports.createVacaLeche = (req, res) => {
  let {
    Identificacion, Raza, Sexo, FechaNacimiento,
    HistorialVeterinario, Precio,
    NumeroPartos, ProduccionDiaria, EstadoReproductivo, UltimoParto
  } = req.body;

  // ✅ archivo por multer o ruta del body
  let foto = null;
  if (req.file && req.file.filename) {
    foto = `/uploads/animales/${req.file.filename}`;
  } else if (req.body.Foto && String(req.body.Foto).trim() !== '') {
    foto = String(req.body.Foto).trim();
  } else if (req.body.foto && String(req.body.foto).trim() !== '') {
    foto = String(req.body.foto).trim();
  }

  Identificacion = (Identificacion || '').trim();
  Raza           = (Raza || '').trim();
  const sexoDb   = ((Sexo || '').trim().toUpperCase().startsWith('H')) ? 'H' : 'M';
  FechaNacimiento = (FechaNacimiento || '').trim();
  HistorialVeterinario = HistorialVeterinario || null;

  const precioNum     = Precio != null && Precio !== '' ? Number(Precio) : null;
  const numPartosNum  = NumeroPartos != null && NumeroPartos !== '' ? Number(NumeroPartos) : null;
  const prodDiariaNum = ProduccionDiaria != null && ProduccionDiaria !== '' ? Number(ProduccionDiaria) : null;
  UltimoParto         = UltimoParto || null;
  EstadoReproductivo  = EstadoReproductivo || null;

  if (!Identificacion || !Raza || !Sexo || !FechaNacimiento || precioNum == null) {
    return res.status(400).json({ error: 'Faltan campos requeridos para Vaca' });
  }

  const sqlAnimal = `
    INSERT INTO Animal (Identificacion, Raza, Sexo, FechaNacimiento, HistorialVeterinario, Precio, Foto)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const paramsAnimal = [Identificacion, Raza, sexoDb, FechaNacimiento, HistorialVeterinario, precioNum, foto];

  db.query(sqlAnimal, paramsAnimal, (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al crear Animal para Vaca' });

    const animalId = result.insertId;
    const sqlVaca = `
      INSERT INTO VacasLeche (id_animal, NumeroPartos, ProduccionDiaria, EstadoReproductivo, UltimoParto)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.query(sqlVaca, [animalId, numPartosNum, prodDiariaNum, EstadoReproductivo, UltimoParto], (err2) => {
      if (err2) return res.status(500).json({ error: 'Error al crear VacaLeche' });
      res.status(201).json({ message: 'Vaca registrada', id: animalId });
    });
  });
};



// controllers/venta.controller.js

// VACAS
// controllers/animales.controller.js
exports.getAllVacasLeche = (req, res) => {
  const sql = `
    SELECT 
      a.Id AS id,
      a.Identificacion,
      a.Raza,
      a.Sexo,
      a.Precio,
      a.Foto
    FROM vacasleche v
    INNER JOIN animal a ON v.id_animal = a.Id
    ORDER BY a.Id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Error al cargar vacas de leche" });
    res.json(results);
  });
};

// controllers/animales.controller.js
exports.getAllCaballosDeporte = (req, res) => {
  const sql = `
    SELECT 
      a.Id AS id,
      a.Identificacion,
      a.Raza,
      a.Sexo,
      a.Precio,
      a.Foto
    FROM caballodeporte c
    INNER JOIN animal a ON c.id_animal = a.Id
    ORDER BY a.Id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Error al cargar caballos de deporte" });
    res.json(results);
  });
};

// ✅ NUEVO: handler que faltaba para /vacas-leche/:identificacion
exports.getVacaByIdentificacion = (req, res) => {
  const { identificacion } = req.params;

  const sql = `
    SELECT 
      a.Id, 
      a.Identificacion, 
      a.Raza, 
      a.Sexo, 
      a.Precio, 
      a.Foto,
      v.NumeroPartos, 
      v.ProduccionDiaria, 
      v.EstadoReproductivo, 
      v.UltimoParto
    FROM Animal a
    JOIN VacasLeche v ON v.id_animal = a.Id
    WHERE a.Identificacion = ?
    LIMIT 1
  `;

  db.query(sql, [identificacion], (err, results) => {
    if (err) {
      console.error('Error al buscar vaca por identificación:', err);
      return res.status(500).json({ error: 'Error al buscar vaca' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Vaca no encontrada' });
    }
    res.json(results[0]);
  });
};
