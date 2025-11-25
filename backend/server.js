const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');

const app = express();
const port = 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:4200'
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- Rutas API para Productos ---

// GET /api/productos - Obtener todos los productos
app.get('/api/productos', (req, res) => {
  db.query('SELECT * FROM productos ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// POST /api/productos - Crear un nuevo producto
app.post('/api/productos', (req, res) => {
  const newProduct = req.body;
  db.query('INSERT INTO productos SET ?', newProduct, (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(201).json({ id: result.insertId, ...newProduct });
  });
});

// PUT /api/productos/:id - Actualizar un producto existente
app.put('/api/productos/:id', (req, res) => {
  const { id } = req.params;
  const productData = req.body;
  db.query('UPDATE productos SET ? WHERE id = ?', [productData, id], (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.affectedRows === 0) return res.status(404).send('Producto no encontrado');
    res.json({ id, ...productData });
  });
});

// DELETE /api/productos/:id - Eliminar un producto
app.delete('/api/productos/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM productos WHERE id = ?', id, (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.affectedRows === 0) return res.status(404).send('Producto no encontrado');
    res.status(204).send();
  });
});


// --- Rutas API para Proveedores ---

// GET /api/proveedores - Obtener todos los proveedores
app.get('/api/proveedores', (req, res) => {
  db.query('SELECT * FROM proveedores ORDER BY nombre ASC', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// POST /api/proveedores - Crear un nuevo proveedor
app.post('/api/proveedores', (req, res) => {
    const newProvider = req.body;
    db.query('INSERT INTO proveedores SET ?', newProvider, (err, result) => {
        if (err) return res.status(500).send(err);
        res.status(201).json({ id: result.insertId, ...newProvider });
    });
});

// PUT /api/proveedores/:id - Actualizar un proveedor
app.put('/api/proveedores/:id', (req, res) => {
    const { id } = req.params;
    const providerData = req.body;
    db.query('UPDATE proveedores SET ? WHERE id = ?', [providerData, id], (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.affectedRows === 0) return res.status(404).send('Proveedor no encontrado');
        res.json({ id, ...providerData });
    });
});

// DELETE /api/proveedores/:id - Eliminar un proveedor
app.delete('/api/proveedores/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM proveedores WHERE id = ?', id, (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.affectedRows === 0) return res.status(404).send('Proveedor no encontrado');
        res.status(204).send();
    });
});


// --- Rutas API para Kardex ---

// GET /api/kardex - Obtener todos los movimientos
app.get('/api/kardex', (req, res) => {
  db.query('SELECT * FROM kardex ORDER BY fecha DESC', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// POST /api/kardex - Registrar un nuevo movimiento
app.post('/api/kardex', (req, res) => {
  const newEntry = req.body;
  // Idealmente, aquí se debería actualizar el stock del producto correspondiente
  // dentro de una transacción para garantizar la consistencia de los datos.
  db.query('INSERT INTO kardex SET ?', newEntry, (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(201).json({ id: result.insertId, ...newEntry });
  });
});


// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor Express escuchando en http://localhost:${port}`);
});
