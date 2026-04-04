import React, { useState } from 'react';
import { Calendar, List, PieChart, Settings, Plus, Check, Circle, ChevronRight, BarChart2 } from 'lucide-react';

// --- DATOS INICIALES ---
const initialProjects = [
  {
    id: 1,
    name: 'Rediseño de Sitio Web',
    status: 'Activo',
    tasks: [
      { id: 101, name: 'Investigación de usuarios', start: '1 Ene', end: '31 Ene', startMonth: 0, duration: 1, status: 'Completada' },
      { id: 102, name: 'Wireframes y prototipos', start: '1 Feb', end: '15 Mar', startMonth: 1, duration: 1.5, status: 'Completada' },
      { id: 103, name: 'Desarrollo frontend', start: '16 Mar', end: '30 May', startMonth: 2.5, duration: 2.5, status: 'En progreso' },
      { id: 104, name: 'Pruebas de calidad', start: '1 Jun', end: '30 Jun', startMonth: 5, duration: 1, status: 'Pendiente' },
    ]
  },
  {
    id: 2,
    name: 'App Móvil v2.0',
    status: 'Activo',
    tasks: [
      { id: 201, name: 'Diseño UI/UX', start: '1 Feb', end: '31 Mar', startMonth: 1, duration: 2, status: 'Completada' },
      { id: 202, name: 'Backend API', start: '1 Mar', end: '30 Jun', startMonth: 2, duration: 4, status: 'En progreso' },
      { id: 203, name: 'Testing y lanzamiento', start: '1 Jul', end: '31 Ago', startMonth: 6, duration: 2, status: 'Pendiente' },
    ]
  }
];

export default function SchedulePro() {
  const [projects, setProjects] = useState(initialProjects);
  const [currentView, setCurrentView] = useState('cronogramas'); // 'cronogramas', 'gantt', 'resumen'
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- LÓGICA DE NEGOCIO ---
  const calculateProgress = (tasks) => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'Completada').length;
    return Math.round((completed / tasks.length) * 100);
  };

  const cycleTaskStatus = (projectId, taskId) => {
    setProjects(projects.map(proj => {
      if (proj.id === projectId) {
        return {
          ...proj,
          tasks: proj.tasks.map(task => {
            if (task.id === taskId) {
              const nextStatus = task.status === 'Pendiente' ? 'En progreso' : 
                                 task.status === 'En progreso' ? 'Completada' : 'Pendiente';
              return { ...task, status: nextStatus };
            }
            return task;
          })
        };
      }
      return proj;
    }));
  };

  // --- COMPONENTES UI AUXILIARES ---
  const StatusBadge = ({ status }) => {
    const styles = {
      'Completada': 'bg-[#e8f3e8] text-[#3b7d3b]',
      'En progreso': 'bg-[#e6eff8] text-[#3b6b9e]',
      'Pendiente': 'bg-[#f8f0e6] text-[#b87c3b]',
      'Activo': 'bg-[#e8f3e8] text-[#3b7d3b]'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  // --- VISTAS ---
  const renderCronogramas = () => (
    <div className="space-y-6">
      {projects.map(proj => (
        <div key={proj.id} className="bg-white rounded-xl p-6 shadow-sm border border-[#e8e4d9]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-serif text-[#4a3f35]">{proj.name}</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#8c7a6b] font-medium">{calculateProgress(proj.tasks)}%</span>
              <StatusBadge status={proj.status} />
            </div>
          </div>
          
          <div className="space-y-4">
            {proj.tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between py-2 group">
                <div className="flex items-center gap-4">
                  <button onClick={() => cycleTaskStatus(proj.id, task.id)} className="text-[#8c7a6b] hover:text-[#4a3f35] transition-colors">
                    {task.status === 'Completada' ? <Check className="w-5 h-5 bg-[#8c7a6b] text-white rounded-full p-0.5" /> : <Circle className="w-5 h-5" />}
                  </button>
                  <span className={`text-[#4a3f35] ${task.status === 'Completada' ? 'line-through opacity-60' : ''}`}>
                    {task.name}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-sm text-[#8c7a6b]">{task.start} &rarr; {task.end}</span>
                  <div className="w-28 text-right">
                    <StatusBadge status={task.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-6 text-sm text-[#8c7a6b] hover:text-[#4a3f35] border border-dashed border-[#d4cdbf] w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Agregar tarea
          </button>
        </div>
      ))}
    </div>
  );

  const renderGantt = () => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'];
    
    return (
      <div className="space-y-6">
        {projects.map(proj => (
          <div key={proj.id} className="bg-white rounded-xl p-6 shadow-sm border border-[#e8e4d9]">
            <h3 className="text-xl font-serif text-[#4a3f35] mb-6">{proj.name}</h3>
            
            <div className="relative">
              <div className="flex justify-end mb-2 text-xs text-[#8c7a6b] font-medium border-b border-[#f0ede6] pb-2">
                <div className="w-2/3 flex justify-between px-2">
                  {months.map(m => <span key={m}>{m}</span>)}
                </div>
              </div>
              
              <div className="space-y-4 py-2">
                {proj.tasks.map(task => (
                  <div key={task.id} className="flex items-center">
                    <div className="w-1/3 text-sm text-[#4a3f35] pr-4 truncate" title={task.name}>
                      {task.name}
                    </div>
                    <div className="w-2/3 relative h-6 bg-[#f8f6f0] rounded-full overflow-hidden">
                      <div 
                        className={`absolute h-full rounded-full transition-all duration-300 ${
                          task.status === 'Completada' ? 'bg-[#9a846f]' : 
                          task.status === 'En progreso' ? 'bg-[#8ab08e]' : 'bg-[#d8c8b8]'
                        }`}
                        style={{ 
                          left: `${(task.startMonth / 8) * 100}%`, 
                          width: `${(task.duration / 8) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-6 flex gap-6 text-xs text-[#8c7a6b]">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#9a846f] rounded-sm"></div> Completada</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#8ab08e] rounded-sm"></div> En progreso</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#d8c8b8] rounded-sm"></div> Pendiente</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderResumen = () => {
    const totalProjects = projects.length;
    const allTasks = projects.flatMap(p => p.tasks);
    const completedTasks = allTasks.filter(t => t.status === 'Completada').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'En progreso').length;

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-[#e8e4d9]">
            <div className="text-4xl font-serif text-[#9a846f] mb-1">{totalProjects}</div>
            <div className="text-sm text-[#8c7a6b]">Proyectos</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-[#e8e4d9]">
            <div className="text-4xl font-serif text-[#6b9e7c] mb-1">{completedTasks}</div>
            <div className="text-sm text-[#8c7a6b]">Tareas completadas</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-[#e8e4d9]">
            <div className="text-4xl font-serif text-[#c29867] mb-1">{inProgressTasks}</div>
            <div className="text-sm text-[#8c7a6b]">En progreso</div>
          </div>
        </div>

        <div className="space-y-6">
          {projects.map(proj => {
            const progress = calculateProgress(proj.tasks);
            return (
              <div key={proj.id} className="bg-white rounded-xl p-6 shadow-sm border border-[#e8e4d9]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-serif text-[#4a3f35]">{proj.name}</h3>
                  <StatusBadge status={proj.status} />
                </div>
                <div className="flex justify-between text-sm text-[#8c7a6b] mb-2">
                  <span>{proj.tasks.length} tareas totales</span>
                  <span>{progress}% completado</span>
                </div>
                <div className="h-2 w-full bg-[#f0ede6] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#8c7a6b] rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f6f3eb] font-sans overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-72 bg-[#9a846f] text-white flex flex-col rounded-r-3xl my-2 shadow-xl z-10">
        <div className="p-8 flex flex-col items-center border-b border-white/10">
          <div className="w-16 h-16 bg-[#e6eff8] rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Calendar className="w-8 h-8 text-[#5a8bb8]" />
          </div>
          <h1 className="text-xl font-serif font-bold">Schedule Pro</h1>
          <p className="text-xs text-white/70">Gestión de Proyectos</p>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          <button onClick={() => setCurrentView('cronogramas')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'cronogramas' ? 'bg-black/10 border-2 border-black/10' : 'hover:bg-white/5 border-2 border-transparent'}`}>
            <List className="w-5 h-5" /> Cronogramas
          </button>
          <button onClick={() => setCurrentView('gantt')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'gantt' ? 'bg-black/10 border-2 border-black/10' : 'hover:bg-white/5 border-2 border-transparent'}`}>
            <BarChart2 className="w-5 h-5" rotate={90} /> Vista Gantt
          </button>
          <button onClick={() => setCurrentView('resumen')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === 'resumen' ? 'bg-black/10 border-2 border-black/10' : 'hover:bg-white/5 border-2 border-transparent'}`}>
            <PieChart className="w-5 h-5" /> Resumen
          </button>
          
          <div className="pt-8 pb-2">
             <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-white/80">
              <Settings className="w-5 h-5" /> Configuración
            </button>
          </div>
        </nav>

        <div className="p-6 border-t border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
            TU
          </div>
          <div>
            <div className="font-medium text-sm">Tu Nombre</div>
            <div className="text-xs text-white/60">Administrador</div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="px-12 py-10 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-serif text-[#4a3f35]">
              {currentView === 'cronogramas' ? 'Cronogramas' : currentView === 'gantt' ? 'Vista Gantt' : 'Resumen General'}
            </h2>
            <p className="text-[#8c7a6b] mt-1">
              {currentView === 'cronogramas' ? 'Gestiona tus proyectos y tareas' : 
               currentView === 'gantt' ? 'Visualiza el tiempo de cada tarea' : 'Estado general de todos los proyectos'}
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#8c7a6b] hover:bg-[#7a6a5d] text-white px-6 py-3 rounded-xl shadow-md transition-colors flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" /> Nuevo Proyecto
          </button>
        </header>

        <main className="px-12 pb-12 max-w-5xl">
          {currentView === 'cronogramas' && renderCronogramas()}
          {currentView === 'gantt' && renderGantt()}
          {currentView === 'resumen' && renderResumen()}
        </main>
      </div>

      {/* MODAL NUEVO PROYECTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#fcfbf9] w-full max-w-md rounded-2xl p-8 shadow-2xl">
            <h3 className="text-2xl font-serif text-[#4a3f35] mb-6">Nuevo Proyecto</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#8c7a6b] mb-1">Nombre del proyecto</label>
                <input type="text" placeholder="Ej: Rediseño de sitio web" className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8c7a6b]/50 text-[#4a3f35]" />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-[#8c7a6b] mb-1">Fecha inicio</label>
                  <input type="date" className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8c7a6b]/50 text-[#4a3f35]" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-[#8c7a6b] mb-1">Fecha fin</label>
                  <input type="date" className="w-full bg-[#f4f1ea] border border-[#d4cdbf] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8c7a6b]/50 text-[#4a3f35]" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg border border-[#d4cdbf] text-[#8c7a6b] hover:bg-black/5 transition-colors font-medium">
                Cancelar
              </button>
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg bg-[#8c7a6b] text-white hover:bg-[#7a6a5d] shadow-md transition-colors font-medium">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
