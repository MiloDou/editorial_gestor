-- ==========================================
-- SCRIPT DE BASE DE DATOS: METÁFORA EDITORIAL
-- ==========================================

-- 1. Tabla de Clientes
CREATE TABLE clientes (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Editores
CREATE TABLE editores (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    rol VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Usuarios (Para el Login)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- 4. Tabla de Proyectos (La tabla principal)
CREATE TABLE proyectos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Activo',
    fecha_entrega DATE,
    cliente_id BIGINT REFERENCES clientes(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Manuscritos (Conectada a Proyectos)
CREATE TABLE manuscritos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    proyecto_id BIGINT REFERENCES proyectos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Tareas (Para el Gantt, conectada a Proyectos)
CREATE TABLE tareas (
    id BIGSERIAL PRIMARY KEY,
    proyecto_id BIGINT REFERENCES proyectos(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    start VARCHAR(50),
    final VARCHAR(50),
    startmonth DOUBLE PRECISION,
    duration DOUBLE PRECISION,
    status VARCHAR(50) DEFAULT 'Pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla Intermedia: Proyecto - Editor (Muchos a Muchos)
CREATE TABLE proyecto_editor (
    proyecto_id BIGINT REFERENCES proyectos(id) ON DELETE CASCADE,
    editor_id BIGINT REFERENCES editores(id) ON DELETE CASCADE,
    asignacion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (proyecto_id, editor_id)
);

-- ==========================================
-- DATOS DE PRUEBA (Opcional, para que tu equipo pueda entrar de una vez)
-- ==========================================
-- INSERT INTO usuarios (nombre, email, password) VALUES ('Admin', 'admin@metafora.com', '123');


