const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_123';


// Tus credenciales de PostgreSQL desde .env
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'cronograma_backend',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
});

// Verificar conexión a la BD
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error en la conexión:', err.message);
});

// ============== CLIENTES ==============
// GET - Obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error GET clientes:', err.message);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// POST - Crear nuevo cliente
app.post('/api/clientes', async (req, res) => {
  const { nombre, telefono } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO clientes (nombre, telefono) VALUES ($1, $2) RETURNING *',
      [nombre, telefono]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error POST clientes:', err.message);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// ============== EDITORES ==============
// GET - Obtener todos los editores
app.get('/api/editores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM editores ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error GET editores:', err.message);
    res.status(500).json({ error: 'Error al obtener editores' });
  }
});

// POST - Crear nuevo editor
app.post('/api/editores', async (req, res) => {
  const { nombre, rol } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO editores (nombre, rol) VALUES ($1, $2) RETURNING *',
      [nombre, rol]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error POST editores:', err.message);
    res.status(500).json({ error: 'Error al crear editor' });
  }
});

// ============== PROYECTOS ==============
// GET - Obtener todos los proyectos con cliente
app.get('/api/proyectos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.nombre as cliente_nombre 
      FROM proyectos p 
      LEFT JOIN clientes c ON p.cliente_id = c.id 
      ORDER BY p.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error GET proyectos:', err.message);
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
});

// GET - Obtener un proyecto por ID con sus detalles
app.get('/api/proyectos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const proyecto = await pool.query(
      'SELECT * FROM proyectos WHERE id = $1',
      [id]
    );
    const tareas = await pool.query(
      'SELECT * FROM tareas WHERE proyecto_id = $1 ORDER BY id DESC',
      [id]
    );
    const editores = await pool.query(`
      SELECT e.* FROM editores e
      JOIN proyecto_editor pe ON e.id = pe.editor_id
      WHERE pe.proyecto_id = $1
    `, [id]);

    res.json({
      proyecto: proyecto.rows[0],
      tareas: tareas.rows,
      editores: editores.rows
    });
  } catch (err) {
    console.error('Error GET proyecto by ID:', err.message);
    res.status(500).json({ error: 'Error al obtener proyecto' });
  }
});

// POST - Crear nuevo proyecto
app.post('/api/proyectos', async (req, res) => {
  const { nombre, status, fecha_entrega, cliente_id } = req.body;
  if (!nombre || !cliente_id) {
    return res.status(400).json({ error: 'Nombre y cliente_id son requeridos' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO proyectos (nombre, status, fecha_entrega, cliente_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, status || 'Activo', fecha_entrega, cliente_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error POST proyectos:', err.message);
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
});

// PUT - Actualizar proyecto
app.put('/api/proyectos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, status, fecha_entrega } = req.body;
  try {
    const result = await pool.query(
      'UPDATE proyectos SET nombre = COALESCE($1, nombre), status = COALESCE($2, status), fecha_entrega = COALESCE($3, fecha_entrega) WHERE id = $4 RETURNING *',
      [nombre, status, fecha_entrega, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error PUT proyectos:', err.message);
    res.status(500).json({ error: 'Error al actualizar proyecto' });
  }
});

// DELETE - Eliminar proyecto
app.delete('/api/proyectos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM proyectos WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    res.json({ message: 'Proyecto eliminado', proyecto: result.rows[0] });
  } catch (err) {
    console.error('Error DELETE proyectos:', err.message);
    res.status(500).json({ error: 'Error al eliminar proyecto' });
  }
});

// ============== TAREAS ==============
// GET - Obtener todas las tareas de un proyecto
app.get('/api/tareas/:proyecto_id', async (req, res) => {
  const { proyecto_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM tareas WHERE proyecto_id = $1 ORDER BY id DESC',
      [proyecto_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error GET tareas:', err.message);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// POST - Crear nueva tarea
app.post('/api/tareas', async (req, res) => {
  const { proyecto_id, nombre, start, final, startMonth, duration, status } = req.body;
  if (!proyecto_id || !nombre) {
    return res.status(400).json({ error: 'proyecto_id y nombre son requeridos' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO tareas (proyecto_id, nombre, start, final, startmonth, duration, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [proyecto_id, nombre, start, final, startMonth, duration, status || 'Pendiente']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error POST tareas:', err.message);
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

// PUT - Actualizar tarea
app.put('/api/tareas/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, start, final, startMonth, duration, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE tareas SET nombre = COALESCE($1, nombre), start = COALESCE($2, start), final = COALESCE($3, final), startMonth = COALESCE($4, startMonth), duration = COALESCE($5, duration), status = COALESCE($6, status) WHERE id = $7 RETURNING *',
      [nombre, start, final, startMonth, duration, status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error PUT tareas:', err.message);
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
});

// DELETE - Eliminar tarea
app.delete('/api/tareas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM tareas WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.json({ message: 'Tarea eliminada', tarea: result.rows[0] });
  } catch (err) {
    console.error('Error DELETE tareas:', err.message);
    res.status(500).json({ error: 'Error al eliminar tarea' });
  }
});

// ============== MANUSCRITOS ==============
// GET - Obtener manuscritos de un proyecto
app.get('/api/manuscritos/:proyecto_id', async (req, res) => {
  const { proyecto_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM manuscritos WHERE proyecto_id = $1 ORDER BY id DESC',
      [proyecto_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error GET manuscritos:', err.message);
    res.status(500).json({ error: 'Error al obtener manuscritos' });
  }
});

// POST - Crear manuscrito
app.post('/api/manuscritos', async (req, res) => {
  const { proyecto_id, nombre } = req.body;
  if (!proyecto_id || !nombre) {
    return res.status(400).json({ error: 'proyecto_id y nombre son requeridos' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO manuscritos (proyecto_id, nombre) VALUES ($1, $2) RETURNING *',
      [proyecto_id, nombre]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error POST manuscritos:', err.message);
    res.status(500).json({ error: 'Error al crear manuscrito' });
  }
});

// ============== PROYECTO_EDITOR (Relación M:N) ==============
// POST - Asignar editor a proyecto
app.post('/api/proyecto-editor', async (req, res) => {
  const { proyecto_id, editor_id } = req.body;
  if (!proyecto_id || !editor_id) {
    return res.status(400).json({ error: 'proyecto_id y editor_id son requeridos' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO proyecto_editor (proyecto_id, editor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
      [proyecto_id, editor_id]
    );
    res.status(201).json(result.rows[0] || { message: 'Asignación existente' });
  } catch (err) {
    console.error('Error POST proyecto_editor:', err.message);
    res.status(500).json({ error: 'Error al asignar editor' });
  }
});

// DELETE - Desasignar editor
app.delete('/api/proyecto-editor/:proyecto_id/:editor_id', async (req, res) => {
  const { proyecto_id, editor_id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM proyecto_editor WHERE proyecto_id = $1 AND editor_id = $2 RETURNING *',
      [proyecto_id, editor_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }
    res.json({ message: 'Editor desasignado' });
  } catch (err) {
    console.error('Error DELETE proyecto_editor:', err.message);
    res.status(500).json({ error: 'Error al desasignar editor' });
  }
});

// ============== AUTENTICACIÓN ==============

// Registro de Usuario (Solo lo usaremos desde la consola por ahora)
app.post('/api/registro', async (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordEncriptada = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email',
      [nombre, email, passwordEncriptada]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error en registro:', err.message);
    res.status(500).json({ error: 'Error al registrar (¿Aseguraste que creaste la tabla usuarios?)' });
  }
});

// Iniciar Sesión (Login)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const usuario = result.rows[0];
    const passwordValida = await bcrypt.compare(password, usuario.password);
    
    if (!passwordValida) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const token = jwt.sign({ id: usuario.id, nombre: usuario.nombre }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ mensaje: 'Login exitoso', token, usuario: { nombre: usuario.nombre, email: usuario.email } });
  } catch (err) {
    console.error('Error en login:', err.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

const server = app.listen(3000, () => {
  console.log('✅ Servidor corriendo en http://localhost:3000');
  console.log('📡 Escuchando peticiones...');
});

server.on('error', (err) => {
  console.error('Error en servidor:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Error no capturado:', err);
});