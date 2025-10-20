import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Presupuestos from './pages/Presupuestos';
import PresupuestoDetalle from './pages/PresupuestoDetalle';
import CargaExcel from './pages/CargaExcel';
import GestionTalleres from './pages/GestionTalleres';
import ConfiguracionGeneral from './pages/ConfiguracionGeneral';
import ListadoAceites from './pages/ListadoAceites';
import useSchedulerUpdates from './hooks/useSchedulerUpdates';
import './App.css';

// Componente interno que usa el hook
function AppContent() {
  // Hook para escuchar actualizaciones del scheduler
  useSchedulerUpdates();

  return (
    <div className="App min-h-screen bg-slate-900">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/presupuestos" element={<Presupuestos />} />
          <Route path="/presupuestos/:referencia" element={<PresupuestoDetalle />} />
          <Route path="/carga" element={<CargaExcel />} />
          <Route path="/configuracion/general" element={<ConfiguracionGeneral />} />
          <Route path="/configuracion/talleres" element={<GestionTalleres />} />
          <Route path="/configuracion/aceites" element={<ListadoAceites />} />
        </Routes>
      </Layout>
    </div>
  );
}

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0, // Los datos se consideran obsoletos inmediatamente
        cacheTime: 5 * 60 * 1000, // Mantener en cache por 5 minutos
        refetchOnWindowFocus: false, // No refetch automático al cambiar ventana
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
