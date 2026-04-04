import React, { useState, useEffect } from 'react';
import { Calendar, List, PieChart, Settings, Plus, Check, Circle, BarChart2 } from 'lucide-react';
import logoEditorial from './assets/logo_editorial.jpg';
import fondoLogin from './assets/imagen_login2.jpeg';
import { fetchData, postData as post_datos, updateData as actualizar_informacion, deleteData, API_ENDPOINTS } from './api/client.js';

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
      <div className="space-y-6">
        {manuscritos.map(manu => (
          <div key={manu.id} className="bg-white rounded-xl p-6 shadow-sm border border-[#e8e4d9]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-serif text-[#4a3f35]">{manu.name}</h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#8c7a6b] font-medium">{Calcular_progresso(manu.tasks)}%</span>
                <Estilos status={manu.status} />
              </div>
            </div>
            <div className="space-y-4">
              {manu.tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between py-2 group">
                  <div className="flex items-center gap-4">
                    <button onClick={() => ciclo_estado_tarea(manu.id, task.id)} className="text-[#8c7a6b] hover:text-[#4a3f35]">
                      {task.status === 'Completada' ? <Check className="w-5 h-5 bg-[#8c7a6b] text-white rounded-full p-0.5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <span className={`text-[#4a3f35] ${task.status === 'Completada' ? 'line-through opacity-60' : ''}`}>{task.nombre || task.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-[#8c7a6b]">{task.start} &rarr; {task.final}</span>
                    <div className="w-28 text-right"><Estilos status={task.status} /></div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setTaskModalManuscritoId(manu.id)} className="mt-6 text-sm text-[#8c7a6b] hover:text-[#4a3f35] border border-dashed border-[#d4cdbf] w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Plus className="w-4 h-4" /> Agregar tarea
            </button>
          </div>
        ))}
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
            <h2 className="text-3xl font-serif text-[#4a3f35]">{currentView === 'cronogramas' ? 'Cronogramas' : currentView === 'gantt' ? 'Vista Gantt' : 'Resumen'}</h2>
            <p className="text-[#8c7a6b] mt-1">
              {currentView === 'cronogramas' ? 'Gestiona tus manuscritos y tareas' : 
               currentView === 'gantt' ? 'Visualiza el tiempo de cada tarea' : 'Estado general de todos los manuscritos'}
            </p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-[#8c7a6b] hover:bg-[#7a6a5d] text-white px-6 py-3 rounded-xl shadow-md transition-colors flex items-center gap-2 font-medium">
            <Plus className="w-5 h-5" /> Nuevo Manuscrito
          </button>
        </header>
        <main className="px-12 pb-12 max-w-5xl">
          {currentView === 'cronogramas' && renderCronogramas()}
          {currentView === 'gantt' && renderGantt()}
          {currentView === 'resumen' && renderResumen()}
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
                <select 
                  value={newManuscritoForm.cliente_id} 
                  onChange={(e) => {
                    if (e.target.value === 'nuevo_cliente') {
                      setIsClientModalOpen(true);
                      Nueva_informacion_manuscrito({ ...newManuscritoForm, cliente_id: '' });
                    } else {
                      Nueva_informacion_manuscrito({ ...newManuscritoForm, cliente_id: e.target.value });
                    }
                  }} 
                  className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3 text-[#4a3f35]"
                >
                  <option value="" disabled hidden>Selecciona un cliente...</option>
                  {clientesList.map(cliente => <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>)}
                  <option disabled>──────────</option>
                  <option value="nuevo_cliente" className="font-bold text-[#8c7a6b]">+ Agregar nuevo cliente...</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#8c7a6b] mb-1">Editor asignado</label>
                <select 
                  value={newManuscritoForm.editor_id} 
                  onChange={(e) => {
                    if (e.target.value === 'nuevo_editor') {
                      setIsEditorModalOpen(true);
                      Nueva_informacion_manuscrito({ ...newManuscritoForm, editor_id: '' });
                    } else {
                      Nueva_informacion_manuscrito({ ...newManuscritoForm, editor_id: e.target.value });
                    }
                  }} 
                  className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3 text-[#4a3f35]"
                >
                  <option value="" disabled hidden>Selecciona un editor...</option>
                  {editoresList.map(editor => <option key={editor.id} value={editor.id}>{editor.nombre} ({editor.rol})</option>)}
                  <option disabled>──────────</option>
                  <option value="nuevo_editor" className="font-bold text-[#8c7a6b]">+ Agregar nuevo editor...</option>
                </select>
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

    </div>
  );
}