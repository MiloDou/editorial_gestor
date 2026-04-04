# 📚 Metáfora Editorial - Gestor de Manuscritos

Sistema de gestión interna para controlar el avance de manuscritos, tareas editoriales y tiempos mediante un diagrama de Gantt dinámico.

## 🛠️ Requisitos Previos

Para correr este proyecto en tu computadora necesitas tener instalado:
1. **Node.js** (v16 o superior)
2. **PostgreSQL** (o el gestor SQL que estemos usando)
3. **Git**

---

## 🗄️ Configuración de la Base de Datos

Antes de correr el código, necesitas levantar la base de datos en tu máquina:

1. Abre tu gestor de base de datos (DataGrip, pgAdmin, DBeaver, etc.).
2. Crea una base de datos nueva (ej. `metafora_db`).
3. Abre el archivo `database.sql` que viene incluido en este repositorio.
4. Copia todo el código SQL, pégalo en tu consola y ejecútalo. Esto creará todas las tablas vacías necesarias (`clientes`, `editores`, `proyectos`, `tareas`, etc.).

---

## 🚀 Cómo correr el proyecto (Frontend y Backend)

Este proyecto requiere que corras dos servidores al mismo tiempo (el backend de la API y el frontend de React).

### 1. Levantar el Backend (API)
Abre una terminal y ubícate en la carpeta donde está el backend (servidor Node.js):

```bash
# Instala las dependencias necesarias (solo la primera vez)
npm install

# Corre el servidor (normalmente corre en el puerto 3000)
node server.js 
# o si tienen nodemon: npm run dev
