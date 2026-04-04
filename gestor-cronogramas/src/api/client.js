// Configuración de la API del backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const API_ENDPOINTS = {
  // Clientes
  CLIENTES: `${API_BASE_URL}/clientes`,
  
  // Editores
  EDITORES: `${API_BASE_URL}/editores`,
  
  // Proyectos
  PROYECTOS: `${API_BASE_URL}/proyectos`,
  
  // Tareas
  TAREAS: `${API_BASE_URL}/tareas`,
  
  // Manuscritos
  MANUSCRITOS: `${API_BASE_URL}/manuscritos`,
  
  // Relación Proyecto-Editor
  PROYECTO_EDITOR: `${API_BASE_URL}/proyecto-editor`,
};

// Función auxiliar para hacer peticiones GET
export const fetchData = async (endpoint) => {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error en fetchData:', error);
    throw error;
  }
};

// Función auxiliar para hacer peticiones POST
export const postData = async (endpoint, data) => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error en postData:', error);
    throw error;
  }
};

// Función auxiliar para hacer peticiones PUT
export const updateData = async (endpoint, data) => {
  try {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error en updateData:', error);
    throw error;
  }
};

// Función auxiliar para hacer peticiones DELETE
export const deleteData = async (endpoint) => {
  try {
    const response = await fetch(endpoint, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error en deleteData:', error);
    throw error;
  }
};
