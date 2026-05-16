import React, { useState, useEffect } from 'react';
import { Calendar, List, PieChart, Settings, Plus, Check, Circle, BarChart2, FileText, Users } from 'lucide-react';
import logoEditorial from './assets/logo_editorial.jpg';
import fondoLogin from './assets/imagen_login2.jpeg';
import { fetchData, postData as post_datos, updateData as actualizar_informacion, deleteData, API_ENDPOINTS } from './api/client.js';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export default function App() {
  // ==========================================
  // 1. ESTADOS (useState)
  // ==========================================
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [manuscritos, Actualizar_manuscritos] = useState([]);
  const [currentView, setCurrentView] = useState('cronogramas');
  const [cargando, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para Modales de Manuscritos y Tareas
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newManuscritoForm, Nueva_informacion_manuscrito] = useState({ nombre: '', cliente_id: '', editor_id: '', fecha_inicio: '', fecha_fin: '' });
  const [clientesList, setClientesList] = useState([]);
  const [editoresList, setEditoresList] = useState([]);

  const [taskModalManuscritoId, setTaskModalManuscritoId] = useState(null); 
  const [newTaskForm, setNewTaskForm] = useState({ nombre: '', start: '', final: '' });

  // Estados para crear Clientes y Editores nuevos
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ nombre: '', telefono: '' });
  
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [newEditorForm, setNewEditorForm] = useState({ nombre: '', rol: 'Editor Auxiliar' });

  // Lista de Tareas dinámicas y Modal para Tarea Personalizada
  const [taskOptions, setTaskOptions] = useState([
    "Revisión ortográfica", "Corrección de estilo", "Diseño de cubierta", 
    "Maquetación interior", "Trámite de ISBN", "Revisión de pruebas", "Impresión"
  ]);
  const [isCustomTaskModalOpen, setIsCustomTaskModalOpen] = useState(false);
  const [customTaskName, setCustomTaskName] = useState('');

  const [editorManuscritoId, setEditorManuscritoId] = useState(null);
  const [editorContenido, setEditorContenido] = useState('');
  const [editorVersiones, setEditorVersiones] = useState([]);
  const [editorGuardando, setEditorGuardando] = useState(false);
  const [editorUltimoGuardado, setEditorUltimoGuardado] = useState(null);
  const [editorMostrarVersiones, setEditorMostrarVersiones] = useState(false);
  const [editorDescripcionVersion, setEditorDescripcionVersion] = useState('');
  const [editorModalVersion, setEditorModalVersion] = useState(false);
  const [editorVersionPreview, setEditorVersionPreview] = useState(null);
  const [editorSnapshotContenido, setEditorSnapshotContenido] = useState('');
  const [toastMensaje, setToastMensaje] = useState(null);
  const [confirmarModal, setConfirmarModal] = useState(null); // {titulo, mensaje, onConfirm}
  const [eliminarModal, setEliminarModal] = useState(null); // {titulo, descripcion, entidad, onConfirm}
  const [eliminarPassword, setEliminarPassword] = useState('');
  const [eliminarPasswordError, setEliminarPasswordError] = useState('');
  const [eliminarVerificando, setEliminarVerificando] = useState(false);
  const autoSaveRef = React.useRef(null);
  // ==========================================
  // 2. EFECTOS Y FUNCIONES LÓGICAS
  // ==========================================
  useEffect(() => {
    if (token) {
      manuscritos_cargados();
      
      fetch('http://localhost:3000/api/clientes')
        .then(res => res.json())
        .then(data => setClientesList(data))
        .catch(err => console.error("Error cargando clientes", err));

      fetch('http://localhost:3000/api/editores')
        .then(res => res.json())
        .then(data => setEditoresList(data))
        .catch(err => console.error("Error cargando editores", err));
    }
  }, [token]);

  const manejarLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLogin, password: passwordLogin })
      });
      const datos = await response.json();

      if (response.ok) {
        localStorage.setItem('token', datos.token);
        setToken(datos.token);
        setErrorLogin('');
      } else {
        setErrorLogin(datos.error || 'Error desconocido');
      }
    } catch (err) {
      console.error('Error en login:', err);
      setErrorLogin('Error de conexión');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const manuscritos_cargados = async () => {
    try {
      setLoading(true);
      // Nota: Se mantiene API_ENDPOINTS.PROYECTOS para no romper el backend
      const manuscritosData = await fetchData(API_ENDPOINTS.PROYECTOS);
      
      const manuscritosConTareas = await Promise.all(
        manuscritosData.map(async (manu) => {
          try {
            const tareas = await fetchData(`${API_ENDPOINTS.TAREAS}/${manu.id}`);
            return { ...manu, name: manu.nombre, tasks: tareas };
          } catch (err) {
            return { ...manu, name: manu.nombre, tasks: [] };
          }
        })
      );
      
      Actualizar_manuscritos(manuscritosConTareas);
      setError(null);
    } catch (err) {
      console.error('Error cargando manuscritos:', err);
      setError('No se pudieron cargar los manuscritos.');
    } finally {
      setLoading(false);
    }
  };

  const Calcular_progresso = (tasks) => {
    if (tasks.length === 0) return 0;
    const completado = tasks.filter(t => t.status === 'Completada').length;
    return Math.round((completado / tasks.length) * 100);
  };

  const ciclo_estado_tarea = async (manuscritoId, taskId) => {
    try {
      const tarea = manuscritos.find(m => m.id === manuscritoId)?.tasks.find(t => t.id === taskId);
      if (!tarea) return;

      const siguiente_estado = tarea.status === 'Pendiente' ? 'En progreso' : 
                               tarea.status === 'En progreso' ? 'Completada' : 'Pendiente';

      await actualizar_informacion(`${API_ENDPOINTS.TAREAS}/${taskId}`, { status: siguiente_estado });

      Actualizar_manuscritos(manuscritos.map(manu => {
        if (manu.id === manuscritoId) {
          return { ...manu, tasks: manu.tasks.map(t => (t.id === taskId ? { ...t, status: siguiente_estado } : t)) };
        }
        return manu;
      }));
    } catch (err) {
      console.error('Error actualizando tarea:', err);
      alert('Error al actualizar la tarea');
    }
  };

  // Guardar Modales Pequeños (Cliente, Editor, Tarea Personalizada)
  const guardarNuevoCliente = async () => {
    if (!newClientForm.nombre.trim()) return alert("El nombre del cliente es obligatorio");
    try {
      const response = await fetch('http://localhost:3000/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClientForm)
      });
      const nuevoCliente = await response.json();
      setClientesList([...clientesList, nuevoCliente]);
      Nueva_informacion_manuscrito({ ...newManuscritoForm, cliente_id: nuevoCliente.id });
      setIsClientModalOpen(false);
      setNewClientForm({ nombre: '', telefono: '' });
    } catch (err) {
      alert("Error al guardar el cliente.");
    }
  };

  const guardarNuevoEditor = async () => {
    if (!newEditorForm.nombre.trim()) return alert("El nombre del editor es obligatorio");
    try {
      const response = await fetch('http://localhost:3000/api/editores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEditorForm)
      });
      const nuevoEditor = await response.json();
      setEditoresList([...editoresList, nuevoEditor]);
      Nueva_informacion_manuscrito({ ...newManuscritoForm, editor_id: nuevoEditor.id });
      setIsEditorModalOpen(false);
      setNewEditorForm({ nombre: '', rol: 'Editor Auxiliar' });
    } catch (err) {
      alert("Error al guardar el editor.");
    }
  };

  const guardarNuevaTareaCustom = () => {
    if (!customTaskName.trim()) return alert("El nombre de la tarea es obligatorio");
    setTaskOptions([...taskOptions, customTaskName]); 
    setNewTaskForm({ ...newTaskForm, nombre: customTaskName }); 
    setIsCustomTaskModalOpen(false);
    setCustomTaskName('');
  };

  const abrirEditor = async (manuscritoId) => {
    setEditorManuscritoId(manuscritoId);
    setCurrentView('editor');
    try {
      const res = await fetch(`http://localhost:3000/api/editor/${manuscritoId}`);
      const data = await res.json();
      setEditorContenido(data.contenido || '');
      const resV = await fetch(`http://localhost:3000/api/editor/${manuscritoId}/versiones`);
      const versiones = await resV.json();
      setEditorVersiones(versiones);
    } catch (err) {
      console.error('Error abriendo editor:', err);
    }
  };

  const autoGuardarEditor = async (contenido, proyectoId) => {
    try {
      await fetch(`http://localhost:3000/api/editor/${proyectoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido })
      });
      setEditorUltimoGuardado(new Date());
    } catch (err) {
      console.error('Error auto-guardando:', err);
    }
  };

  const handleEditorChange = (e) => {
    const nuevoContenido = e.target.value;
    setEditorContenido(nuevoContenido);
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    setEditorGuardando(true);
    autoSaveRef.current = setTimeout(async () => {
      await autoGuardarEditor(nuevoContenido, editorManuscritoId);
      setEditorGuardando(false);
    }, 2000);
  };

  const mostrarToast = (mensaje, tipo = 'ok') => {
    setToastMensaje({ texto: mensaje, tipo });
    setTimeout(() => setToastMensaje(null), 3000);
  };

  const pedirEliminar = ({ titulo, descripcion, entidad, onConfirm }) => {
    setEliminarPassword('');
    setEliminarPasswordError('');
    setEliminarModal({ titulo, descripcion, entidad, onConfirm });
  };

  const confirmarEliminar = async () => {
    if (!eliminarPassword.trim()) {
      setEliminarPasswordError('Ingresa tu contraseña para continuar.');
      return;
    }
    setEliminarVerificando(true);
    setEliminarPasswordError('');
    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLogin, password: eliminarPassword })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        const accion = eliminarModal.onConfirm;
        setEliminarModal(null);
        setEliminarPassword('');
        await accion();
      } else {
        setEliminarPasswordError('Contraseña incorrecta. Intenta de nuevo.');
      }
    } catch (err) {
      setEliminarPasswordError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEliminarVerificando(false);
    }
  };

  const eliminarProyecto = (manu) => {
    pedirEliminar({
      titulo: 'Eliminar proyecto',
      descripcion: `El proyecto "${manu.name}" y todas sus tareas serán eliminados permanentemente.`,
      entidad: 'proyecto',
      onConfirm: async () => {
        try {
          await deleteData(`${API_ENDPOINTS.PROYECTOS}/${manu.id}`);
          Actualizar_manuscritos(manuscritos.filter(m => m.id !== manu.id));
          mostrarToast(`Proyecto "${manu.name}" eliminado`);
        } catch (err) {
          mostrarToast('Error al eliminar el proyecto', 'error');
        }
      }
    });
  };

  const eliminarTarea = (manu, task) => {
    pedirEliminar({
      titulo: 'Eliminar tarea',
      descripcion: `La tarea "${task.nombre || task.name}" del proyecto "${manu.name}" será eliminada permanentemente.`,
      entidad: 'tarea',
      onConfirm: async () => {
        try {
          await deleteData(`${API_ENDPOINTS.TAREAS}/${task.id}`);
          Actualizar_manuscritos(manuscritos.map(m =>
            m.id === manu.id ? { ...m, tasks: m.tasks.filter(t => t.id !== task.id) } : m
          ));
          mostrarToast(`Tarea "${task.nombre || task.name}" eliminada`);
        } catch (err) {
          mostrarToast('Error al eliminar la tarea', 'error');
        }
      }
    });
  };

  const eliminarCliente = (cliente) => {
    pedirEliminar({
      titulo: 'Eliminar cliente',
      descripcion: `El cliente "${cliente.nombre}" será eliminado permanentemente.`,
      entidad: 'cliente',
      onConfirm: async () => {
        try {
          await deleteData(`${API_ENDPOINTS.CLIENTES}/${cliente.id}`);
          setClientesList(clientesList.filter(c => c.id !== cliente.id));
          mostrarToast(`Cliente "${cliente.nombre}" eliminado`);
        } catch (err) {
          mostrarToast('Error al eliminar el cliente', 'error');
        }
      }
    });
  };

  const eliminarEditor = (editor) => {
    pedirEliminar({
      titulo: 'Eliminar editor',
      descripcion: `El editor "${editor.nombre}" será eliminado permanentemente.`,
      entidad: 'editor',
      onConfirm: async () => {
        try {
          await deleteData(`${API_ENDPOINTS.EDITORES}/${editor.id}`);
          setEditoresList(editoresList.filter(e => e.id !== editor.id));
          mostrarToast(`Editor "${editor.nombre}" eliminado`);
        } catch (err) {
          mostrarToast('Error al eliminar el editor', 'error');
        }
      }
    });
  };

  const guardarVersion = async () => {
    if (!editorDescripcionVersion.trim()) return;
    const contenidoAGuardar = editorSnapshotContenido;
    try {
      const res = await fetch(`http://localhost:3000/api/editor/${editorManuscritoId}/versiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contenido: contenidoAGuardar,
          descripcion: editorDescripcionVersion,
          autor: 'Editor'
        })
      });
      const nuevaVersion = await res.json();
      setEditorVersiones([nuevaVersion, ...editorVersiones]);
      setEditorModalVersion(false);
      setEditorDescripcionVersion('');
      mostrarToast('Versión guardada correctamente');
    } catch (err) {
      mostrarToast('Error al guardar la versión', 'error');
    }
  };

  const restaurarVersion = async (version) => {
    try {
      setEditorGuardando(true);
      // Fetch contenido completo (el listado solo trae preview de 100 chars)
      const res = await fetch(`http://localhost:3000/api/editor/${editorManuscritoId}/versiones/${version.id}`);
      const versionCompleta = await res.json();
      const contenidoCompleto = versionCompleta.contenido || '';
      setEditorContenido(contenidoCompleto);
      setEditorVersionPreview(null);
      await fetch(`http://localhost:3000/api/editor/${editorManuscritoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido: contenidoCompleto })
      });
      setEditorUltimoGuardado(new Date());
      setEditorGuardando(false);
      mostrarToast(`Versión ${version.numero_version} restaurada`);
    } catch (err) {
      console.error('Error restaurando versión:', err);
      setEditorGuardando(false);
      mostrarToast('Error al restaurar la versión', 'error');
    }
  };

  const eliminarVersion = (version) => {
    pedirEliminar({
      titulo: 'Eliminar versión',
      descripcion: `La versión ${version.numero_version} "${version.descripcion}" será eliminada permanentemente y no podrá recuperarse.`,
      entidad: 'version',
      onConfirm: async () => {
        try {
          await fetch(`http://localhost:3000/api/editor/${editorManuscritoId}/versiones/${version.id}`, { method: 'DELETE' });
          setEditorVersiones(editorVersiones.filter(v => v.id !== version.id));
          mostrarToast(`Versión ${version.numero_version} eliminada`);
        } catch (err) {
          mostrarToast('Error al eliminar versión', 'error');
        }
      }
    });
  };

  const contarPalabras = (texto) => {
    if (!texto || !texto.trim()) return 0;
    return texto.trim().split(/\s+/).length;
  };

  const descargarPDF = (version) => {
    const doc = new jsPDF();
    const manuscrito = manuscritos.find(m => m.id === editorManuscritoId);
    const titulo = manuscrito?.name || 'Manuscrito';
    const contenido = version ? version.contenido : editorContenido;
    const nombreVersion = version ? `v${version.numero_version} - ${version.descripcion}` : 'Versión actual';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(titulo, 20, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(140, 122, 107);
    doc.text(nombreVersion, 20, 30);
    doc.text(`Descargado: ${new Date().toLocaleDateString('es-GT')}`, 20, 36);

    doc.setDrawColor(200, 190, 180);
    doc.line(20, 40, 190, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    const lineas = doc.splitTextToSize(contenido || '(Sin contenido)', 170);
    doc.text(lineas, 20, 50);

    doc.save(`${titulo}_${nombreVersion}.pdf`);
  };

  const descargarDOCX = async (version) => {
    const manuscrito = manuscritos.find(m => m.id === editorManuscritoId);
    const titulo = manuscrito?.name || 'Manuscrito';
    const contenido = version ? version.contenido : editorContenido;
    const nombreVersion = version ? `v${version.numero_version} - ${version.descripcion}` : 'Versión actual';

    const parrafos = (contenido || '(Sin contenido)').split('\n').map(linea =>
      new Paragraph({
        children: [new TextRun({ text: linea, size: 24, font: 'Calibri' })],
        spacing: { after: 200 }
      })
    );

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: titulo,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [new TextRun({ text: nombreVersion, size: 20, color: '8c7a6b', italics: true })],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: `Descargado: ${new Date().toLocaleDateString('es-GT')}`, size: 18, color: '999999' })],
            spacing: { after: 400 }
          }),
          ...parrafos
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${titulo}_${nombreVersion}.docx`);
  };

  // Guardar Manuscritos y Tareas en DB
  const crear_nuevo_manuscrito = async () => {
    if (!newManuscritoForm.nombre.trim() || !newManuscritoForm.cliente_id) {
      alert('Por favor ingresa el nombre y selecciona un cliente');
      return;
    }

    try {
      const nuevo_manuscrito = await post_datos(API_ENDPOINTS.PROYECTOS, {
        nombre: newManuscritoForm.nombre,
        status: 'Activo',
        cliente_id: parseInt(newManuscritoForm.cliente_id),
        fecha_entrega: newManuscritoForm.fecha_fin
      });

      if (newManuscritoForm.editor_id) {
        await fetch('http://localhost:3000/api/proyecto-editor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proyecto_id: nuevo_manuscrito.id, editor_id: parseInt(newManuscritoForm.editor_id) })
        });
      }

      Actualizar_manuscritos([{ ...nuevo_manuscrito, name: nuevo_manuscrito.nombre, tasks: [] }, ...manuscritos]);
      Nueva_informacion_manuscrito({ nombre: '', cliente_id: '', editor_id: '', fecha_inicio: '', fecha_fin: '' });
      setIsModalOpen(false);
    } catch (err) {
      alert('Error al crear el manuscrito');
    }
  };

  const guardar_nueva_tarea = async () => {
    if (!newTaskForm.nombre) return alert('Por favor selecciona una tarea del menú');

    try {
      let mesInicio = 0;
      let duracionMeses = 1;

      if (newTaskForm.start && newTaskForm.final) {
        const startDate = new Date(newTaskForm.start + 'T00:00:00');
        const finalDate = new Date(newTaskForm.final + 'T00:00:00');
        mesInicio = startDate.getMonth(); 
        const aniosDif = finalDate.getFullYear() - startDate.getFullYear();
        const mesesDif = finalDate.getMonth() - startDate.getMonth();
        duracionMeses = (aniosDif * 12) + mesesDif + 1; 
        if (duracionMeses <= 0) duracionMeses = 1; 
      }

      const nuevo_pendiente = await post_datos(API_ENDPOINTS.TAREAS, {
        proyecto_id: taskModalManuscritoId, // Se mantiene proyecto_id para el backend
        nombre: newTaskForm.nombre,
        status: 'Pendiente',
        startMonth: mesInicio,
        duration: duracionMeses,
        start: newTaskForm.start || 'Hoy',
        final: newTaskForm.final || 'Hoy'
      });

      const tareaFormateada = { ...nuevo_pendiente, name: nuevo_pendiente.nombre };
      Actualizar_manuscritos(manuscritos.map(manu => manu.id === taskModalManuscritoId ? { ...manu, tasks: [...manu.tasks, tareaFormateada] } : manu));
      setTaskModalManuscritoId(null);
      setNewTaskForm({ nombre: '', start: '', final: '' });
    } catch (err) {
      alert('Error al crear la tarea');
    }
  };

  // ==========================================
  // 3. COMPONENTES VISUALES
  // ==========================================
  const Estilos = ({ status: estado }) => {
    const Estilo = { 'Completada': 'bg-[#e8f3e8] text-[#3b7d3b]', 'En progreso': 'bg-[#e6eff8] text-[#3b6b9e]', 'Pendiente': 'bg-[#f8f0e6] text-[#b87c3b]', 'Activo': 'bg-[#e8f3e8] text-[#3b7d3b]' };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${Estilo[estado] || 'bg-gray-100'}`}>{estado}</span>;
  };

  const renderCronogramas = () => {
    if (cargando) return <div className="flex justify-center py-12 text-[#8c7a6b]">Cargando manuscritos...</div>;
    if (error) return <div className="bg-red-50 p-6 text-red-700">Error: {error}</div>;
    if (manuscritos.length === 0) return <div className="text-center py-12 text-[#8c7a6b]">No hay manuscritos. ¡Crea uno nuevo!</div>;

    return (
      <>
      <div className="space-y-6">
        {manuscritos.map(manu => (
          <div key={manu.id} className="bg-white rounded-xl p-6 shadow-sm border border-[#e8e4d9]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-serif text-[#4a3f35]">{manu.name}</h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#8c7a6b] font-medium">{Calcular_progresso(manu.tasks)}%</span>
                <Estilos status={manu.status} />
                <button
                  onClick={() => eliminarProyecto(manu)}
                  title="Eliminar proyecto"
                  className="text-red-300 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {manu.tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between py-2 group">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => ciclo_estado_tarea(manu.id, task.id)}
                      title={`Estado: ${task.status} — click para avanzar`}
                      className="flex-shrink-0 transition-transform hover:scale-110 active:scale-95"
                    >
                      {task.status === 'Completada' ? (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#8c7a6b]">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </span>
                      ) : task.status === 'En progreso' ? (
                        <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-[#3b6b9e] bg-[#e6eff8]">
                          <span className="w-2 h-2 rounded-full bg-[#3b6b9e]" />
                        </span>
                      ) : (
                        <Circle className="w-5 h-5 text-[#8c7a6b] hover:text-[#4a3f35]" />
                      )}
                    </button>
                    <span className={`text-[#4a3f35] ${task.status === 'Completada' ? 'line-through opacity-60' : ''}`}>{task.nombre || task.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-[#8c7a6b]">{task.start} &rarr; {task.final}</span>
                    <div className="w-28 text-right"><Estilos status={task.status} /></div>
                    <button
                      onClick={() => eliminarTarea(manu, task)}
                      title="Eliminar tarea"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-300 hover:text-red-500 ml-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => abrirEditor(manu.id)} 
              className="mt-4 text-sm text-[#8c7a6b] hover:text-[#4a3f35] border border-dashed border-[#d4cdbf] w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" /> Abrir editor de texto
            </button>
            <button onClick={() => setTaskModalManuscritoId(manu.id)} className="mt-6 text-sm text-[#8c7a6b] hover:text-[#4a3f35] border border-dashed border-[#d4cdbf] w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Plus className="w-4 h-4" /> Agregar tarea
            </button>
          </div>
        ))}
      </div>

      </>
    );
  };

  const renderContactos = () => {
    return (
      <div className="space-y-6">

        {/* ── Clientes ── */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e8e4d9]">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0ede6]">
            <div>
              <h3 className="text-lg font-serif text-[#4a3f35]">Clientes</h3>
              <p className="text-xs text-[#8c7a6b] mt-0.5">{clientesList.length} registrado{clientesList.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setIsClientModalOpen(true)}
              className="flex items-center gap-2 text-sm text-white bg-[#8c7a6b] hover:bg-[#7a6a5d] px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Agregar cliente
            </button>
          </div>
          {clientesList.length === 0 ? (
            <div className="py-12 text-center text-[#b0a090]">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sin clientes registrados.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f0ede6]">
              {clientesList.map(cliente => (
                <div key={cliente.id} className="flex items-center justify-between px-6 py-4 group hover:bg-[#faf9f6] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#e8e4d9] flex items-center justify-center text-[#8c7a6b] text-sm font-medium">
                      {cliente.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#4a3f35]">{cliente.nombre}</p>
                      {cliente.telefono && <p className="text-xs text-[#8c7a6b]">{cliente.telefono}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => eliminarCliente(cliente)}
                    title="Eliminar cliente"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Editores ── */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e8e4d9]">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0ede6]">
            <div>
              <h3 className="text-lg font-serif text-[#4a3f35]">Editores</h3>
              <p className="text-xs text-[#8c7a6b] mt-0.5">{editoresList.length} registrado{editoresList.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setIsEditorModalOpen(true)}
              className="flex items-center gap-2 text-sm text-white bg-[#8c7a6b] hover:bg-[#7a6a5d] px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Agregar editor
            </button>
          </div>
          {editoresList.length === 0 ? (
            <div className="py-12 text-center text-[#b0a090]">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sin editores registrados.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f0ede6]">
              {editoresList.map(editor => (
                <div key={editor.id} className="flex items-center justify-between px-6 py-4 group hover:bg-[#faf9f6] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#dde8f0] flex items-center justify-center text-[#3b6b9e] text-sm font-medium">
                      {editor.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#4a3f35]">{editor.nombre}</p>
                      <p className="text-xs text-[#8c7a6b]">{editor.rol}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => eliminarEditor(editor)}
                    title="Eliminar editor"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    );
  };

  const renderGantt = () => {
    const mesesNombresTodos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    return (
      <div className="space-y-6">
        {manuscritos.map(manu => {
          let minMes = 11;
          let maxMes = 0;
          
          if (manu.tasks && manu.tasks.length > 0) {
            manu.tasks.forEach(t => {
              const sm = parseInt(t.startmonth ?? t.startMonth ?? 0);
              const dur = parseInt(t.duration ?? 1);
              const em = sm + dur - 1;
              if (sm < minMes) minMes = sm;
              if (em > maxMes) maxMes = em;
            });
          } else {
            minMes = 0; maxMes = 11;
          }
          
          if (maxMes > 11) maxMes = 11;
          const totalMesesMostrar = (maxMes - minMes) + 1;
          
          const mesesMostrar = [];
          for(let i = minMes; i <= maxMes; i++) {
            mesesMostrar.push(mesesNombresTodos[i]);
          }

          return (
            <div key={manu.id} className="bg-white rounded-xl p-6 shadow-sm border border-[#e8e4d9]">
              <h3 className="text-xl font-serif text-[#4a3f35] mb-6">{manu.name}</h3>
              <div className="relative overflow-x-auto">
                <div className="flex mb-4">
                  <div className="w-1/3 flex-shrink-0"></div>
                  <div className="w-2/3 grid gap-0 border-b border-[#f0ede6]" style={{ gridTemplateColumns: `repeat(${totalMesesMostrar}, minmax(0, 1fr))` }}>
                    {mesesMostrar.map((m) => (
                      <div key={m} className="text-center text-xs text-[#8c7a6b] font-medium py-2 border-r border-[#f0ede6] last:border-r-0 px-1">
                        <div className="truncate">{m}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  {manu.tasks.map(task => {
                    const sm = parseInt(task.startmonth ?? task.startMonth ?? 0);
                    const dur = parseInt(task.duration ?? 1);
                    const mesRelativoInicio = sm - minMes;
                    const leftPorcentaje = (mesRelativoInicio / totalMesesMostrar) * 100;
                    const anchoPorcentaje = (dur / totalMesesMostrar) * 100;

                    return (
                      <div key={task.id} className="flex items-center">
                        <div className="w-1/3 text-sm text-[#4a3f35] pr-4 truncate flex-shrink-0" title={task.name}>{task.name || task.nombre}</div>
                        <div className="w-2/3 grid gap-0 relative h-8 bg-[#f8f6f0]/30 rounded-lg overflow-hidden" style={{ gridTemplateColumns: `repeat(${totalMesesMostrar}, minmax(0, 1fr))` }}>
                          {mesesMostrar.map((m, idx) => <div key={`div-${idx}`} className="border-r border-[#f0ede6]/50 last:border-r-0 h-full"></div>)}
                          <div 
                            className={`absolute h-full rounded-lg transition-all duration-300 top-0 ${task.status === 'Completada' ? 'bg-[#9a846f]' : task.status === 'En progreso' ? 'bg-[#8ab08e]' : 'bg-[#d8c8b8]'}`}
                            style={{ left: `${leftPorcentaje}%`, width: `${anchoPorcentaje}%`, minWidth: '4px' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderResumen = () => {
    const totalManuscritos = manuscritos.length;
    const allTasks = manuscritos.flatMap(m => m.tasks);
    const completedTasks = allTasks.filter(t => t.status === 'Completada').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'En progreso').length;

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-[#e8e4d9]"><div className="text-4xl font-serif text-[#9a846f] mb-1">{totalManuscritos}</div><div className="text-sm text-[#8c7a6b]">Manuscritos</div></div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-[#e8e4d9]"><div className="text-4xl font-serif text-[#6b9e7c] mb-1">{completedTasks}</div><div className="text-sm text-[#8c7a6b]">Tareas completadas</div></div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-[#e8e4d9]"><div className="text-4xl font-serif text-[#c29867] mb-1">{inProgressTasks}</div><div className="text-sm text-[#8c7a6b]">En progreso</div></div>
        </div>

        <div className="space-y-6">
          {manuscritos.map(manu => {
            const progress = Calcular_progresso(manu.tasks);
            return (
              <div key={manu.id} className="bg-white rounded-xl p-6 shadow-sm border border-[#e8e4d9]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-serif text-[#4a3f35]">{manu.name}</h3>
                  <Estilos status={manu.status} />
                </div>
                <div className="flex justify-between text-sm text-[#8c7a6b] mb-2">
                  <span>{manu.tasks.length} tareas totales</span>
                  <span>{progress}% completado</span>
                </div>
                <div className="h-2 w-full bg-[#f0ede6] rounded-full overflow-hidden">
                  <div className="h-full bg-[#8c7a6b] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  const renderEditor = () => {
  const manuscrito = manuscritos.find(m => m.id === editorManuscritoId);
  const palabras = contarPalabras(editorContenido || '');
  const caracteres = (editorContenido || '').length;

  return (
    <div className="flex gap-6 h-full" style={{ minHeight: 'calc(100vh - 200px)' }}>
      <div className="flex-1 flex flex-col">
        <div className="bg-white rounded-xl border border-[#e8e4d9] p-4 mb-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#8c7a6b]">
              {editorGuardando ? (
                <span className="text-amber-500">● Guardando...</span>
              ) : editorUltimoGuardado ? (
                <span className="text-green-600">✓ Guardado {editorUltimoGuardado.toLocaleTimeString()}</span>
              ) : (
                <span className="text-[#8c7a6b]">Sin cambios</span>
              )}
            </span>
            <span className="text-xs text-[#b0a090] border-l border-[#e8e4d9] pl-4">
              {palabras} palabras · {caracteres} caracteres
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditorMostrarVersiones(!editorMostrarVersiones)}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors flex items-center gap-2 ${editorMostrarVersiones ? 'bg-[#4a3f35] text-white border-[#4a3f35]' : 'border-[#d4cdbf] text-[#8c7a6b] hover:bg-[#f4f1ea]'}`}
            >
              📋 Versiones ({editorVersiones.length})
            </button>
            
            <button
              onClick={() => descargarPDF(null)}
              className="px-4 py-2 rounded-lg text-sm border border-[#d4cdbf] text-[#8c7a6b] hover:bg-[#f4f1ea] transition-colors"
            >
              📄 PDF
            </button>

            <button
              onClick={() => descargarDOCX(null)}
              className="px-4 py-2 rounded-lg text-sm border border-[#d4cdbf] text-[#8c7a6b] hover:bg-[#f4f1ea] transition-colors"
            >
              📝 DOCX
            </button>
            <button
              onClick={() => {
                setEditorSnapshotContenido(editorContenido);
                setEditorModalVersion(true);
              }}
              className="px-4 py-2 rounded-lg text-sm bg-[#8c7a6b] text-white hover:bg-[#7a6a5d] transition-colors flex items-center gap-2"
            >
              💾 Guardar versión
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-[#e8e4d9] shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#f0ede6] bg-[#faf9f6]">
            <h3 className="font-serif text-[#4a3f35] text-lg">{manuscrito?.name || 'Manuscrito'}</h3>
            <p className="text-xs text-[#8c7a6b] mt-0.5">Editor de texto — los cambios se guardan automáticamente</p>
          </div>
          <textarea
            value={editorContenido}
            onChange={handleEditorChange}
            placeholder="Comienza a escribir tu manuscrito aquí..."
            className="flex-1 w-full p-8 text-[#3a3028] leading-relaxed resize-none focus:outline-none text-base"
            style={{ minHeight: '500px', fontFamily: "'Lora', 'Palatino Linotype', Georgia, serif", lineHeight: '2', fontSize: '1.05rem', letterSpacing: '0.01em' }}
          />
        </div>
      </div>

      {editorMostrarVersiones && (
        <div className="w-72 flex-shrink-0">
          <div className="bg-white rounded-xl border border-[#e8e4d9] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f0ede6] bg-[#faf9f6]">
              <h4 className="font-serif text-[#4a3f35]">Historial de versiones</h4>
              <p className="text-xs text-[#8c7a6b] mt-0.5">{editorVersiones.length} versiones guardadas</p>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
              {editorVersiones.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#8c7a6b]">
                  <p>Aún no hay versiones.</p>
                  <p className="mt-1 text-xs">Usa "Guardar versión" para crear un punto de restauración.</p>
                </div>
              ) : (
                editorVersiones.map(version => (
                  <div key={version.id} className={`p-4 border-b border-[#f0ede6] hover:bg-[#faf9f6] transition-colors ${editorVersionPreview?.id === version.id ? 'bg-[#f4f1ea]' : ''}`}>
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-bold text-[#8c7a6b] bg-[#f0ede6] px-2 py-0.5 rounded-full">v{version.numero_version}</span>
                      <span className="text-xs text-[#b0a090]">{new Date(version.created_at).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' })}</span>
                    </div>
                    <p className="text-sm text-[#4a3f35] font-medium mt-2">{version.descripcion}</p>
                    <p className="text-xs text-[#8c7a6b] mt-1">{version.autor}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={async () => {
                        if (editorVersionPreview?.id === version.id) {
                          setEditorVersionPreview(null);
                        } else {
                          try {
                            const res = await fetch(`http://localhost:3000/api/editor/${editorManuscritoId}/versiones/${version.id}`);
                            const versionCompleta = await res.json();
                            setEditorVersionPreview(versionCompleta);
                          } catch (err) {
                            setEditorVersionPreview(version);
                          }
                        }
                      }} className="flex-1 text-xs py-1.5 rounded-lg border border-[#d4cdbf] text-[#8c7a6b] hover:bg-[#f4f1ea] transition-colors">
                        {editorVersionPreview?.id === version.id ? 'Cerrar' : 'Ver'}
                      </button>

                      <button onClick={async () => {
                        const res = await fetch(`http://localhost:3000/api/editor/${editorManuscritoId}/versiones/${version.id}`);
                        const vc = await res.json();
                        descargarPDF(vc);
                      }} className="text-xs py-1.5 px-2 rounded-lg text-[#8c7a6b] border border-[#d4cdbf] hover:bg-[#f4f1ea] transition-colors">PDF</button>
                      <button onClick={async () => {
                        const res = await fetch(`http://localhost:3000/api/editor/${editorManuscritoId}/versiones/${version.id}`);
                        const vc = await res.json();
                        descargarDOCX(vc);
                      }} className="text-xs py-1.5 px-2 rounded-lg text-[#8c7a6b] border border-[#d4cdbf] hover:bg-[#f4f1ea] transition-colors">DOCX</button>
                      <button onClick={() => restaurarVersion(version)} className="flex-1 text-xs py-1.5 rounded-lg bg-[#4a3f35] text-white hover:bg-black transition-colors">Restaurar</button>
                      <button onClick={() => eliminarVersion(version)} className="text-xs py-1.5 px-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors">✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {editorVersionPreview && (
            <div className="mt-4 bg-white rounded-xl border border-[#e8e4d9] shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#f0ede6] bg-amber-50 flex items-center justify-between">
                <span className="text-xs font-medium text-amber-700">Previsualización v{editorVersionPreview.numero_version}</span>
                <button onClick={() => setEditorVersionPreview(null)} className="text-amber-400 text-xs hover:text-amber-600">✕</button>
              </div>
              <div className="p-4 max-h-48 overflow-y-auto">
                <p className="text-xs text-[#4a3f35] leading-relaxed font-serif whitespace-pre-wrap">{editorVersionPreview.contenido || '(Sin contenido)'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {editorModalVersion && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#e8e4d9] overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-[#f0ede6]">
              <h3 className="text-xl font-serif text-[#4a3f35]">Guardar versión</h3>
              <p className="text-xs text-[#8c7a6b] mt-1">
                Se guardará el contenido actual —{' '}
                <span className="font-medium text-[#4a3f35]">{contarPalabras(editorSnapshotContenido)} palabras, {editorSnapshotContenido.length} caracteres</span>
              </p>
            </div>
            {editorSnapshotContenido.trim() && (
              <div className="mx-6 mt-4 bg-[#faf9f6] border border-[#e8e4d9] rounded-lg p-3 max-h-28 overflow-y-auto">
                <p className="text-xs text-[#8c7a6b] leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {editorSnapshotContenido.slice(0, 300)}{editorSnapshotContenido.length > 300 ? '…' : ''}
                </p>
              </div>
            )}
            <div className="px-6 py-4">
              <label className="block text-sm text-[#8c7a6b] mb-2">Descripción de esta versión</label>
              <input
                type="text"
                value={editorDescripcionVersion}
                onChange={(e) => setEditorDescripcionVersion(e.target.value)}
                className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3 text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#8c7a6b]/50"
                placeholder="Ej: Primera revisión completa, corrección de estilo..."
                onKeyDown={(e) => e.key === 'Enter' && guardarVersion()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => { setEditorModalVersion(false); setEditorDescripcionVersion(''); }}
                className="px-4 py-2 rounded-lg text-sm border border-[#d4cdbf] text-[#8c7a6b] hover:bg-[#f4f1ea]"
              >Cancelar</button>
              <button
                onClick={guardarVersion}
                disabled={!editorDescripcionVersion.trim()}
                className="px-4 py-2 rounded-lg text-sm bg-[#8c7a6b] text-white hover:bg-[#7a6a5d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >💾 Guardar versión</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

  // ==========================================
  // 4. BARRERA DE LOGIN
  // ==========================================
  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center font-sans bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: `url(${fondoLogin})` }}>
        <div className="absolute inset-0 bg-[#4a3f35]/60 backdrop-blur-[2px]"></div>
        <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md border border-[#e8e4d9] relative z-10">
          <div className="text-center mb-8"><h1 className="text-3xl font-serif text-[#4a3f35] font-bold">Metáfora Editorial</h1></div>
          <form onSubmit={manejarLogin} className="space-y-5">
            <div><label className="block text-sm text-[#8c7a6b] mb-1">Correo Electrónico</label><input type="email" value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3 text-[#4a3f35]" required /></div>
            <div><label className="block text-sm text-[#8c7a6b] mb-1">Contraseña</label><input type="password" value={passwordLogin} onChange={(e) => setPasswordLogin(e.target.value)} className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3 text-[#4a3f35]" required /></div>
            {errorLogin && <p className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">{errorLogin}</p>}
            <button type="submit" className="w-full bg-[#8c7a6b] text-white py-3 rounded-lg hover:bg-[#7a6a5d] shadow-md transition-colors font-medium mt-4">Entrar al Sistema</button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // 5. RENDERIZADO DEL GESTOR (Pantalla Principal)
  // ==========================================
  return (
    <div className="flex bg-[#f6f3eb] font-sans overflow-hidden" style={{height: '100vh', width: '100vw'}}>
      {/* SIDEBAR */}
      <div className="w-72 bg-[#9a846f] text-white flex flex-col rounded-r-3xl my-2 shadow-xl z-10">
        <div className="p-8 flex flex-col items-center border-b border-white/10">
          <div className="w-16 h-16 bg-[#e6eff8] rounded-full flex items-center justify-center mb-4 shadow-inner overflow-hidden">
            <img src={logoEditorial} alt="Logo Editorial" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-serif font-bold">Metáfora Editorial</h1>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          <button onClick={() => setCurrentView('cronogramas')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'cronogramas' ? 'bg-black/10 border-2 border-black/10' : 'hover:bg-white/5 border-2 border-transparent'}`}>
            <List className="w-5 h-5" /> Cronogramas
          </button>
          <button onClick={() => setCurrentView('gantt')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'gantt' ? 'bg-black/10 border-2 border-black/10' : 'hover:bg-white/5 border-2 border-transparent'}`}>
            <BarChart2 className="w-5 h-5" /> Vista Gantt
          </button>
          <button onClick={() => setCurrentView('resumen')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'resumen' ? 'bg-black/10 border-2 border-black/10' : 'hover:bg-white/5 border-2 border-transparent'}`}>
            <PieChart className="w-5 h-5" /> Resumen
          </button>
          <button onClick={() => setCurrentView('editor')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'editor' ? 'bg-black/10 border-2 border-black/10' : 'hover:bg-white/5 border-2 border-transparent'}`}>
            <FileText className="w-5 h-5" /> Editor
          </button>
          <button onClick={() => setCurrentView('contactos')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'contactos' ? 'bg-black/10 border-2 border-black/10' : 'hover:bg-white/5 border-2 border-transparent'}`}>
            <Users className="w-5 h-5" /> Contactos
          </button>
        </nav>

        <div className="p-6 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">TU</div><div><div className="font-medium text-sm">Admin</div></div></div>
          <button onClick={handleLogout} className="text-xs bg-black/20 px-3 py-1.5 rounded-lg hover:bg-black/40">Salir</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="px-12 py-10 flex justify-between items-end">
          <div>
           <h2 className="text-3xl font-serif text-[#4a3f35]">{currentView === 'cronogramas' ? 'Cronogramas' : currentView === 'gantt' ? 'Vista Gantt' : currentView === 'editor' ? 'Editor de Manuscrito' : currentView === 'contactos' ? 'Contactos' : 'Resumen'}</h2>
            <p className="text-[#8c7a6b] mt-1">
              {currentView === 'cronogramas' ? 'Gestiona tus manuscritos y tareas' : 
                currentView === 'gantt' ? 'Visualiza el tiempo de cada tarea' :
                currentView === 'editor' ? 'Edita el contenido con control de versiones' :
                currentView === 'contactos' ? 'Gestiona clientes y editores' : 'Estado general de todos los manuscritos'}
            </p>
          </div>
          {currentView === 'cronogramas' && (
            <button onClick={() => setIsModalOpen(true)} className="bg-[#8c7a6b] hover:bg-[#7a6a5d] text-white px-6 py-3 rounded-xl shadow-md transition-colors flex items-center gap-2 font-medium">
              <Plus className="w-5 h-5" /> Nuevo Manuscrito
            </button>
          )}
        </header>
        <main className={`px-12 pb-12 ${currentView === 'cronogramas' || currentView === 'contactos' ? 'max-w-5xl' : 'w-full'}`}>
          {currentView === 'cronogramas' && renderCronogramas()}
          {currentView === 'gantt' && renderGantt()}
          {currentView === 'resumen' && renderResumen()}
          {currentView === 'editor' && renderEditor()}
          {currentView === 'contactos' && renderContactos()}
        </main>
      </div>

      {/* 🚀 MODAL 1: NUEVO MANUSCRITO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#fcfbf9] w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <h3 className="text-2xl font-serif text-[#4a3f35] mb-6">Nuevo Manuscrito</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#8c7a6b] mb-1">Nombre del manuscrito</label>
                <input type="text" value={newManuscritoForm.nombre} onChange={(e) => Nueva_informacion_manuscrito({ ...newManuscritoForm, nombre: e.target.value })} className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3 text-[#4a3f35]" />
              </div>
              
              <div>
                <label className="block text-sm text-[#8c7a6b] mb-1">Cliente</label>
                <div className="bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg overflow-hidden">
                  <div className="max-h-32 overflow-y-auto divide-y divide-[#e8e4d9]">
                    {clientesList.map(cliente => (
                      <div key={cliente.id} className={`px-3 py-2 cursor-pointer hover:bg-[#ede9df] transition-colors ${newManuscritoForm.cliente_id == cliente.id ? 'bg-[#e4dfd5] font-medium' : ''}`}
                        onClick={() => Nueva_informacion_manuscrito({ ...newManuscritoForm, cliente_id: cliente.id })}>
                        <span className="text-sm text-[#4a3f35]">{cliente.nombre}</span>
                      </div>
                    ))}
                    {clientesList.length === 0 && <p className="text-xs text-[#8c7a6b] px-3 py-2">Sin clientes registrados.</p>}
                  </div>
                  <button onClick={() => setIsClientModalOpen(true)}
                    className="w-full text-xs text-[#8c7a6b] hover:text-[#4a3f35] hover:bg-[#ede9df] py-2 flex items-center justify-center gap-1 border-t border-[#e8e4d9] transition-colors">
                    <Plus className="w-3 h-3" /> Agregar nuevo cliente
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#8c7a6b] mb-1">Editor asignado</label>
                <div className="bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg overflow-hidden">
                  <div className="max-h-32 overflow-y-auto divide-y divide-[#e8e4d9]">
                    {editoresList.map(editor => (
                      <div key={editor.id} className={`px-3 py-2 cursor-pointer hover:bg-[#ede9df] transition-colors ${newManuscritoForm.editor_id == editor.id ? 'bg-[#e4dfd5] font-medium' : ''}`}
                        onClick={() => Nueva_informacion_manuscrito({ ...newManuscritoForm, editor_id: editor.id })}>
                        <span className="text-sm text-[#4a3f35]">{editor.nombre} <span className="text-xs text-[#8c7a6b]">({editor.rol})</span></span>
                      </div>
                    ))}
                    {editoresList.length === 0 && <p className="text-xs text-[#8c7a6b] px-3 py-2">Sin editores registrados.</p>}
                  </div>
                  <button onClick={() => setIsEditorModalOpen(true)}
                    className="w-full text-xs text-[#8c7a6b] hover:text-[#4a3f35] hover:bg-[#ede9df] py-2 flex items-center justify-center gap-1 border-t border-[#e8e4d9] transition-colors">
                    <Plus className="w-3 h-3" /> Agregar nuevo editor
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-[#8c7a6b] mb-1">Fecha inicio</label><input type="date" value={newManuscritoForm.fecha_inicio} onChange={(e) => Nueva_informacion_manuscrito({ ...newManuscritoForm, fecha_inicio: e.target.value })} className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3 text-[#4a3f35]" /></div>
                <div><label className="block text-sm text-[#8c7a6b] mb-1">Fecha fin</label><input type="date" value={newManuscritoForm.fecha_fin} onChange={(e) => Nueva_informacion_manuscrito({ ...newManuscritoForm, fecha_fin: e.target.value })} className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3 text-[#4a3f35]" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg border border-[#d4cdbf] text-[#8c7a6b]">Cancelar</button>
              <button onClick={crear_nuevo_manuscrito} className="px-5 py-2.5 rounded-lg bg-[#8c7a6b] text-white">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 MODAL 2: AGREGAR TAREA AL MANUSCRITO */}
      {taskModalManuscritoId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#fcfbf9] w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <h3 className="text-2xl font-serif text-[#4a3f35] mb-6">Agregar Tarea</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#8c7a6b] mb-1">Nombre de la tarea</label>
                <select 
                  value={newTaskForm.nombre} 
                  onChange={(e) => {
                    if (e.target.value === 'nueva_tarea_custom') {
                      setIsCustomTaskModalOpen(true);
                      setNewTaskForm({ ...newTaskForm, nombre: '' });
                    } else {
                      setNewTaskForm({ ...newTaskForm, nombre: e.target.value });
                    }
                  }} 
                  className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3 text-[#4a3f35]"
                >
                  <option value="" disabled hidden>Selecciona una tarea...</option>
                  {taskOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  <option disabled>──────────</option>
                  <option value="nueva_tarea_custom" className="font-bold text-[#8c7a6b]">+ Agregar nueva tarea personalizada...</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-[#8c7a6b] mb-1">Fecha inicio</label><input type="date" value={newTaskForm.start} onChange={(e) => setNewTaskForm({ ...newTaskForm, start: e.target.value })} className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3" /></div>
                <div><label className="block text-sm text-[#8c7a6b] mb-1">Fecha fin</label><input type="date" value={newTaskForm.final} onChange={(e) => setNewTaskForm({ ...newTaskForm, final: e.target.value })} className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setTaskModalManuscritoId(null)} className="px-5 py-2.5 rounded-lg border border-[#d4cdbf] text-[#8c7a6b]">Cancelar</button>
              <button onClick={guardar_nueva_tarea} className="px-5 py-2.5 rounded-lg bg-[#8c7a6b] text-white">Guardar Tarea</button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 MODAL 3: NUEVO CLIENTE */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#e8e4d9]">
            <h3 className="text-xl font-serif text-[#4a3f35] mb-4">Nuevo Cliente</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#8c7a6b] mb-1">Nombre</label>
                <input type="text" value={newClientForm.nombre} onChange={(e) => setNewClientForm({...newClientForm, nombre: e.target.value})} className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-3 py-2 text-[#4a3f35]" placeholder="Ej: Librería Sophos" />
              </div>
              <div>
                <label className="block text-sm text-[#8c7a6b] mb-1">Teléfono (opcional)</label>
                <input type="text" value={newClientForm.telefono} onChange={(e) => setNewClientForm({...newClientForm, telefono: e.target.value})} className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-3 py-2 text-[#4a3f35]" placeholder="Ej: 2419-7070" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsClientModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border border-[#d4cdbf] text-[#8c7a6b] hover:bg-gray-50">Cancelar</button>
              <button onClick={guardarNuevoCliente} className="px-4 py-2 rounded-lg text-sm bg-[#4a3f35] text-white hover:bg-black">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 MODAL 4: NUEVO EDITOR */}
      {isEditorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#e8e4d9]">
            <h3 className="text-xl font-serif text-[#4a3f35] mb-4">Nuevo Editor</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#8c7a6b] mb-1">Nombre Completo</label>
                <input type="text" value={newEditorForm.nombre} onChange={(e) => setNewEditorForm({...newEditorForm, nombre: e.target.value})} className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-3 py-2 text-[#4a3f35]" placeholder="Ej: María José" />
              </div>
              <div>
                <label className="block text-sm text-[#8c7a6b] mb-1">Rol</label>
                <select value={newEditorForm.rol} onChange={(e) => setNewEditorForm({...newEditorForm, rol: e.target.value})} className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-3 py-2 text-[#4a3f35]">
                  <option value="Editor Auxiliar">Editor Auxiliar</option>
                  <option value="Editor Principal">Editor Principal</option>
                  <option value="Diseñador">Diseñador</option>
                  <option value="Corrector">Corrector</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsEditorModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border border-[#d4cdbf] text-[#8c7a6b] hover:bg-gray-50">Cancelar</button>
              <button onClick={guardarNuevoEditor} className="px-4 py-2 rounded-lg text-sm bg-[#4a3f35] text-white hover:bg-black">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 MODAL 5: TAREA PERSONALIZADA */}
      {isCustomTaskModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70]">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#e8e4d9]">
            <h3 className="text-xl font-serif text-[#4a3f35] mb-4">Nueva Tarea Personalizada</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#8c7a6b] mb-1">Nombre de la tarea</label>
                <input type="text" value={customTaskName} onChange={(e) => setCustomTaskName(e.target.value)} className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-3 py-2 text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-[#8c7a6b]/50" placeholder="Ej: Traducción al inglés" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsCustomTaskModalOpen(false)} className="px-4 py-2 rounded-lg text-sm border border-[#d4cdbf] text-[#8c7a6b] hover:bg-gray-50">Cancelar</button>
              <button onClick={guardarNuevaTareaCustom} className="px-4 py-2 rounded-lg text-sm bg-[#4a3f35] text-white hover:bg-black">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal eliminación con contraseña ── */}
      {eliminarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200]">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-[#e8e4d9] overflow-hidden">
            <div className="bg-red-50 px-6 py-5 border-b border-red-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-red-800">{eliminarModal.titulo}</h3>
                <p className="text-sm text-red-600 mt-1 leading-relaxed">{eliminarModal.descripcion}</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm text-[#8c7a6b] mb-2">Confirma tu contraseña para continuar</label>
              <input
                type="password"
                value={eliminarPassword}
                onChange={(e) => { setEliminarPassword(e.target.value); setEliminarPasswordError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && confirmarEliminar()}
                className={`w-full bg-[#f4f1ea] border rounded-lg px-4 py-3 text-[#4a3f35] focus:outline-none focus:ring-2 focus:ring-red-300 ${eliminarPasswordError ? 'border-red-400' : 'border-[#d4cdbf]'}`}
                placeholder="Tu contraseña de acceso..."
                autoFocus
              />
              {eliminarPasswordError && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {eliminarPasswordError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => { setEliminarModal(null); setEliminarPassword(''); setEliminarPasswordError(''); }}
                className="px-4 py-2 rounded-lg text-sm border border-[#d4cdbf] text-[#8c7a6b] hover:bg-[#f4f1ea] transition-colors"
              >Cancelar</button>
              <button
                onClick={confirmarEliminar}
                disabled={eliminarVerificando || !eliminarPassword.trim()}
                className="px-4 py-2 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {eliminarVerificando ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Verificando...</>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar definitivamente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toastMensaje && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toastMensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-[#e8f3e8] text-[#3b7d3b] border border-[#c5e0c5]'}`}>
          {toastMensaje.tipo === 'error' ? '✕' : '✓'} {toastMensaje.texto}
        </div>
      )}

    </div>
  );
}