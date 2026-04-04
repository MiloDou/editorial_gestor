## ✅ VERIFICACIÓN DE CONEXIÓN A BASE DE DATOS

### Pasos para probar que todo está funcionando:

---

## 1️⃣ CREAR LAS TABLAS EN PostgreSQL

Abre **pgAdmin** o **DataGrip** y ejecuta este SQL:

```sql
-- Tabla CLIENTES
CREATE TABLE clientes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla EDITORES
CREATE TABLE editores (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(150) NOT NULL,
  rol VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla PROYECTOS
CREATE TABLE proyectos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  fecha_entrega DATE,
  cliente_id BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla MANUSCRITOS
CREATE TABLE manuscritos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(255) NOT NULL,
  proyecto_id BIGINT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla PROYECTO_EDITOR (Relación M:N)
CREATE TABLE proyecto_editor (
  proyecto_id BIGINT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  editor_id BIGINT NOT NULL REFERENCES editores(id) ON DELETE CASCADE,
  asignacion_date TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (proyecto_id, editor_id)
);

-- Tabla TAREAS
CREATE TABLE tareas (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  proyecto_id BIGINT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  start VARCHAR(50),
  end VARCHAR(50),
  startMonth FLOAT,
  duration FLOAT,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_proyectos_cliente ON proyectos(cliente_id);
CREATE INDEX idx_manuscritos_proyecto ON manuscritos(proyecto_id);
CREATE INDEX idx_tareas_proyecto ON tareas(proyecto_id);
CREATE INDEX idx_proyecto_editor_proyecto ON proyecto_editor(proyecto_id);
CREATE INDEX idx_proyecto_editor_editor ON proyecto_editor(editor_id);
```

---

## 2️⃣ CONFIGURAR CREDENCIALES

### En `backend-cronogramas/.env`:
Abre el archivo y actualiza tus credenciales:
```
DB_USER=postgres
DB_PASSWORD=tu_contraseña
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cronograma_backend
```

---

## 3️⃣ INICIAR EL SERVIDOR BACKEND

En la carpeta `backend-cronogramas`:
```bash
npm install
npm start
```

Debes ver:
```
✅ Servidor corriendo en http://localhost:3000
📡 Escuchando peticiones...
✅ Conectado a PostgreSQL
```

---

## 4️⃣ PROBAR LAS RUTAS (Postman, Thunder Client o curl)

### Health Check
```
GET http://localhost:3000/api/health
```
Respuesta esperada:
```json
{ "status": "Server is running" }
```

### Crear un Cliente
```
POST http://localhost:3000/api/clientes
Content-Type: application/json

{
  "nombre": "Editorial ABC",
  "telefono": "123456789"
}
```

### Obtener todos los clientes
```
GET http://localhost:3000/api/clientes
```

### Crear un Editor
```
POST http://localhost:3000/api/editores
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "rol": "Editor Senior"
}
```

### Crear un Proyecto
```
POST http://localhost:3000/api/proyectos
Content-Type: application/json

{
  "nombre": "Rediseño de Sitio Web",
  "status": "Activo",
  "fecha_entrega": "2026-06-30",
  "cliente_id": 1
}
```

### Crear una Tarea
```
POST http://localhost:3000/api/tareas
Content-Type: application/json

{
  "proyecto_id": 1,
  "nombre": "Investigación de usuarios",
  "start": "1 Ene",
  "end": "31 Ene",
  "startMonth": 0,
  "duration": 1,
  "status": "Pendiente"
}
```

---

## 5️⃣ CONECTAR EL FRONTEND

En `gestor-cronogramas/src/App.jsx`, importa y usa:
```javascript
import { fetchData, postData, API_ENDPOINTS } from './api/client.js';

// Cargar proyectos:
const loadProyectos = async () => {
  const data = await fetchData(API_ENDPOINTS.PROYECTOS);
  console.log('Proyectos:', data);
};

// Crear nuevo proyecto:
const createProyecto = async () => {
  const newProject = await postData(API_ENDPOINTS.PROYECTOS, {
    nombre: "Nuevo Proyecto",
    status: "Activo",
    cliente_id: 1
  });
  console.log('Proyecto creado:', newProject);
};
```

---

## 6️⃣ CHECKLISTS DE VERIFICACIÓN

✅ Tablas creadas en PostgreSQL  
✅ `.env` del backend configurado con credenciales correctas  
✅ Servidor backend iniciado sin errores  
✅ `/api/health` responde correctamente  
✅ Puedes crear clientes/editores/proyectos con POST  
✅ Puedes obtener datos con GET  
✅ Frontend se conecta al backend  
✅ Los datos se guardan y se recuperan correctamente  

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "Error en la conexión: connect ECONNREFUSED"
- Verifica que PostgreSQL esté corriendo
- Comprueba que los datos en `.env` son correctos

### Error: "Relation does not exist"
- Asegúrate de que ejecutaste el SQL para crear todas las tablas

### Error: "CORS error"
- El servidor backend tiene CORS habilitado, debería funcionar
- Si aún hay problemas, reinicia ambos servidores

---

¡Listo! Ahora todo debe estar conectado correctamente. 🎉
