import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  FileText, 
  Upload, 
  Settings, 
  Menu, 
  X,
  Car,
  TrendingUp,
  Building,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Presupuestos', href: '/presupuestos', icon: FileText },
  ];

  const configSubmenu = [
    { name: 'General', href: '/configuracion/general', icon: Settings },
    { name: 'Gestión Talleres', href: '/configuracion/talleres', icon: Building },
    { name: 'Listado Aceites', href: '/configuracion/aceites', icon: Car },
    { name: 'Actualización de datos', href: '/carga', icon: Upload },
  ];

  const isActive = (path) => location.pathname === path;
  const isConfigActive = () => location.pathname.startsWith('/configuracion') || location.pathname === '/carga';

  // Abrir automáticamente el submenú de configuración cuando estemos en una página de configuración
  useEffect(() => {
    if (isConfigActive()) {
      setConfigOpen(true);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Sidebar móvil */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-slate-800 shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center space-x-2">
              <Car className="w-8 h-8 text-blue-500" />
              <span className="text-xl font-bold text-white">OC Presup CRM</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            {/* Submenú de Configuración */}
            <div className="space-y-1">
              <button
                onClick={() => setConfigOpen(!configOpen)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors ${
                  isConfigActive()
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5" />
                  <span>Configuración</span>
                </div>
                {configOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {configOpen && (
                <div className="ml-6 space-y-1">
                  {configSubmenu.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive(item.href)
                            ? 'bg-blue-500 text-white'
                            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>

      {/* Sidebar desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-slate-800 shadow-xl">
          <div className="flex items-center space-x-2 p-4 border-b border-slate-700">
            <Car className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-bold text-white">OC Presup CRM</span>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            {/* Submenú de Configuración */}
            <div className="space-y-1">
              <button
                onClick={() => setConfigOpen(!configOpen)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors ${
                  isConfigActive()
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5" />
                  <span>Configuración</span>
                </div>
                {configOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {configOpen && (
                <div className="ml-6 space-y-1">
                  {configSubmenu.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive(item.href)
                            ? 'bg-blue-500 text-white'
                            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center space-x-2 text-slate-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Sistema de Presupuestos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="lg:pl-64">
        {/* Header móvil */}
        <div className="sticky top-0 z-40 bg-slate-800 border-b border-slate-700 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <Car className="w-6 h-6 text-blue-500" />
              <span className="text-lg font-semibold text-white">OC Presup CRM</span>
            </div>
            <div className="w-10" /> {/* Espaciador */}
          </div>
        </div>

        {/* Contenido de la página */}
        <main className="p-4 lg:p-8">
          <div className="fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
