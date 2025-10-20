import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  Search, 
  Filter, 
  Eye, 
  MessageSquare, 
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  Circle,
  X,
  Check,
  Paperclip
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { presupuestosAPI, talleresAPI, formatError } from '../services/api';

const Presupuestos = () => {
  // Estados para filtros y paginación
  const [filters, setFilters] = useState({
    search: '',
    fechaDesde: '',
    fechaHasta: '',
    tipoSiniestro: '',
    taller: '',
    estado: '',
    subestado: '',
  });
  
  // Estado local para el campo de búsqueda
  const [searchInput, setSearchInput] = useState('');
  
  // Referencia al input para evitar pérdida de foco
  const searchInputRef = useRef(null);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
  });
  const [sortConfig, setSortConfig] = useState({
    sortBy: 'fecha',
    sortOrder: 'desc',
  });

  // Estado separado para la búsqueda activa (sin causar re-renderizados)
  const [activeSearch, setActiveSearch] = useState('');

  // Consultas para obtener datos
  const { data: presupuestosData, isLoading, error, refetch } = useQuery(
    ['presupuestos', { ...filters, search: activeSearch }, pagination, sortConfig],
    () => presupuestosAPI.getPresupuestos({
      ...filters,
      search: activeSearch,
      ...pagination,
      ...sortConfig,
    }).then(res => res.data),
    { 
      keepPreviousData: true,
      refetchInterval: 30000, // Actualizar cada 30 segundos
      refetchOnWindowFocus: true // Refrescar al volver a la ventana
    }
  );

  const { data: talleres } = useQuery(
    'talleres',
    () => talleresAPI.getTalleres().then(res => res.data),
    { 
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchInterval: 60000, // Actualizar cada minuto
      refetchOnWindowFocus: true
    }
  );

  const { data: tiposSiniestro } = useQuery(
    'tiposSiniestro',
    () => presupuestosAPI.getTiposSiniestro().then(res => res.data),
    { 
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchInterval: 60000, // Actualizar cada minuto
      refetchOnWindowFocus: true
    }
  );

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Función para formatear fechas
  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
  };

  // Función para calcular y formatear margen
  const calculateMargin = (importe, costo) => {
    if (!importe || importe === 0) return 0;
    const margin = ((importe - costo) / importe) * 100;
    return margin;
  };

  // Función para formatear margen como porcentaje
  const formatMargin = (margin) => {
    return `${Math.round(margin)}%`;
  };

  // Función para obtener el nombre del taller
  const getTallerNombre = (codigoTaller) => {
    if (!talleres || !codigoTaller) return codigoTaller;
    const taller = talleres.find(t => t.codigo === codigoTaller);
    return taller ? taller.nombre : codigoTaller;
  };

  // Función para calcular el importe total de todas las piezas
  const calcularImporteTotal = (presupuesto) => {
    if (!presupuesto.piezas || presupuesto.piezas.length === 0) {
      return presupuesto.importe || 0;
    }
    return presupuesto.piezas.reduce((total, pieza) => {
      return total + (pieza.importe || 0);
    }, 0);
  };

  // Función para calcular el costo total de todas las piezas
  const calcularCostoTotal = (presupuesto) => {
    if (!presupuesto.piezas || presupuesto.piezas.length === 0) {
      return presupuesto.costo || 0;
    }
    return presupuesto.piezas.reduce((total, pieza) => {
      return total + (pieza.costo || 0);
    }, 0);
  };


  // Función para manejar cambios en filtros
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Resetear a primera página
  };

  // Función para manejar cambios en el campo de búsqueda
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    
    // Mantener el foco en el input después del re-renderizado
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        // Restaurar la posición del cursor al final
        searchInputRef.current.setSelectionRange(value.length, value.length);
      }
    }, 0);
  };

  // Debounce para la búsqueda automática
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setActiveSearch(searchInput);
      setFilters(prev => ({ ...prev, search: searchInput }));
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500); // 500ms de delay

    return () => clearTimeout(timeoutId);
  }, [searchInput]);


  // Función para limpiar filtros
  const clearFilters = () => {
    setFilters({
      search: '',
      fechaDesde: '',
      fechaHasta: '',
      tipoSiniestro: '',
      taller: '',
      estado: '',
      subestado: '',
    });
    setSearchInput(''); // Limpiar el campo de búsqueda
    setActiveSearch(''); // Limpiar la búsqueda activa
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // Enfocar el input después de limpiar
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };

  // Función para manejar ordenamiento
  const handleSort = (column) => {
    setSortConfig(prev => ({
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Función para cambiar página
  const changePage = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Función para cambiar límite por página
  const changeLimit = (newLimit) => {
    setPagination(prev => ({ ...prev, page: 1, limit: newLimit }));
  };



  // Componente de filtros
  const FiltersSection = () => (
    <div className="card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filtros
        </h3>
        <button
          onClick={clearFilters}
          className="text-slate-400 hover:text-white text-sm"
        >
          Limpiar filtros
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Búsqueda */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Búsqueda
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={handleSearchInputChange}
              placeholder="Referencia, cliente..."
              className="input pl-10"
            />
          </div>
        </div>

        {/* Fecha desde */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Fecha desde
          </label>
          <input
            type="date"
            value={filters.fechaDesde}
            onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
            className="input"
          />
        </div>

        {/* Fecha hasta */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Fecha hasta
          </label>
          <input
            type="date"
            value={filters.fechaHasta}
            onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
            className="input"
          />
        </div>

        {/* Tipo de siniestro */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Tipo de siniestro
          </label>
          <select
            value={filters.tipoSiniestro}
            onChange={(e) => handleFilterChange('tipoSiniestro', e.target.value)}
            className="input"
          >
            <option value="">Todos</option>
            {tiposSiniestro?.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>

        {/* Taller */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Taller
          </label>
          <select
            value={filters.taller}
            onChange={(e) => handleFilterChange('taller', e.target.value)}
            className="input"
          >
            <option value="">Todos</option>
            {talleres?.reduce((unique, taller) => {
              const codigo = typeof taller === 'object' ? taller.codigo : taller;
              const nombre = typeof taller === 'object' ? taller.nombre : taller;
              
              // Verificar si ya existe un taller con este nombre
              const existe = unique.find(t => t.nombre === nombre);
              
              if (!existe) {
                unique.push({ codigo, nombre });
              } else {
                // Si existe con el mismo nombre, mantener el primer código encontrado
                // Esto unifica talleres con igual mapeo (mismo nombre)
              }
              
              return unique;
            }, [])?.map((taller) => {
              // Obtener todos los códigos que corresponden a este nombre
              const codigosConMismoNombre = talleres?.filter(t => {
                const nombre = typeof t === 'object' ? t.nombre : t;
                return nombre === taller.nombre;
              }).map(t => typeof t === 'object' ? t.codigo : t) || [];
              
              return (
                <option key={taller.nombre} value={codigosConMismoNombre.join(',')}>
                  {taller.nombre}
                </option>
              );
            })}
          </select>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Estado
          </label>
          <select
            value={filters.estado}
            onChange={(e) => handleFilterChange('estado', e.target.value)}
            className="input"
          >
            <option value="">Todos</option>
            <option value="Abierto">Abierto</option>
            <option value="Rechazado">Rechazado</option>
            <option value="Aceptado">Aceptado</option>
          </select>
        </div>
        
        {/* Filtro por Subestado */}
        <div className="flex flex-col">
          <label className="label">Subestado</label>
          <select
            value={filters.subestado}
            onChange={(e) => handleFilterChange('subestado', e.target.value)}
            className="input"
          >
            <option value="">Todos</option>
            <option value="En espera">En espera</option>
            <option value="Pendiente">Pendiente</option>
          </select>
        </div>

        {/* Límite por página */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Por página
          </label>
          <select
            value={pagination.limit}
            onChange={(e) => changeLimit(parseInt(e.target.value))}
            className="input"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>
    </div>
  );

  // Componente de paginación
  const Pagination = () => {
    const { page, limit } = pagination;
    const { total, pages } = presupuestosData?.pagination || {};

    if (!total) return null;

    const startItem = (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-slate-400">
          Mostrando {startItem} a {endItem} de {total} resultados
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => changePage(page - 1)}
            disabled={page <= 1}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-sm text-slate-300">
            Página {page} de {pages}
          </span>
          
          <button
            onClick={() => changePage(page + 1)}
            disabled={page >= pages}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">
          <AlertTriangle className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Error al cargar presupuestos
        </h3>
        <p className="text-slate-400">{formatError(error)}</p>
        <button
          onClick={() => refetch()}
          className="btn-primary mt-4"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Presupuestos</h1>
          <p className="text-slate-400 mt-1">
            Gestión y seguimiento de presupuestos automotores
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="btn-secondary"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <FiltersSection />

      {/* Tabla de presupuestos */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table w-full" style={{ tableLayout: 'fixed', minWidth: '1200px' }}>
            <thead>
              <tr>
                <th 
                  className="cursor-pointer hover:bg-slate-600 w-24"
                  onClick={() => handleSort('referencia')}
                >
                  <div className="flex items-center">
                    Referencia
                    {sortConfig.sortBy === 'referencia' && (
                      <span className="ml-1">
                        {sortConfig.sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="w-48">Cliente</th>
                <th 
                  className="cursor-pointer hover:bg-slate-600 w-20"
                  onClick={() => handleSort('fecha')}
                >
                  <div className="flex items-center">
                    Fecha
                    {sortConfig.sortBy === 'fecha' && (
                      <span className="ml-1">
                        {sortConfig.sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="w-32">Descripción</th>
                <th className="w-20">Taller</th>
                <th 
                  className="cursor-pointer hover:bg-slate-600 w-32"
                  onClick={() => handleSort('estado')}
                >
                  <div className="flex items-center">
                    Estado
                    {sortConfig.sortBy === 'estado' && (
                      <span className="ml-1">
                        {sortConfig.sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-slate-600 w-24"
                  onClick={() => handleSort('importe')}
                >
                   <div className="flex items-center">
                     Importe
                     {sortConfig.sortBy === 'importe' && (
                       <span className="ml-1">
                         {sortConfig.sortOrder === 'asc' ? '↑' : '↓'}
                       </span>
                     )}
                   </div>
                 </th>
                 <th 
                   className="cursor-pointer hover:bg-slate-600 w-20"
                   onClick={() => handleSort('margen')}
                 >
                   <div className="flex items-center">
                     Margen %
                     {sortConfig.sortBy === 'margen' && (
                       <span className="ml-1">
                         {sortConfig.sortOrder === 'asc' ? '↑' : '↓'}
                       </span>
                     )}
                   </div>
                 </th>
                 <th className="w-24">Usuario</th>
                 <th className="text-center w-12">OR</th>
                <th className="w-20">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                                 <tr>
                   <td colSpan="11" className="text-center py-8">
                     <div className="spinner w-6 h-6 mx-auto"></div>
                   </td>
                 </tr>
              ) : presupuestosData?.presupuestos?.length > 0 ? (
                presupuestosData.presupuestos.map((presupuesto, index) => (
                  <tr key={`${presupuesto.referencia}-${index}`}>
                                         <td className="font-mono text-blue-400 text-xs w-24">
                       {typeof presupuesto.referencia === 'object' ? JSON.stringify(presupuesto.referencia) : presupuesto.referencia}
                     </td>
                     <td className="truncate w-48" title={typeof presupuesto.nombre === 'object' ? JSON.stringify(presupuesto.nombre) : presupuesto.nombre}>
                       <span className="text-xs">{typeof presupuesto.nombre === 'object' ? JSON.stringify(presupuesto.nombre) : presupuesto.nombre}</span>
                     </td>
                     <td className="text-xs w-20">{formatDate(presupuesto.auditoria?.fechaCreacion || presupuesto.fechaCarga)}</td>
                                          <td className="truncate w-32" title={typeof presupuesto.descripcionSiniestro === 'object' ? JSON.stringify(presupuesto.descripcionSiniestro) : presupuesto.descripcionSiniestro}>
                       <span className="text-xs">{typeof presupuesto.descripcionSiniestro === 'object' ? JSON.stringify(presupuesto.descripcionSiniestro) : presupuesto.descripcionSiniestro}</span>
                     </td>
                                           <td className="whitespace-nowrap text-xs w-20">{getTallerNombre(presupuesto.taller)}</td>
                     <td className="whitespace-nowrap w-32">
                       <span className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                         presupuesto.estado === 'Abierto' ? 
                           (presupuesto.subestado === 'Pendiente' ? 'bg-red-500 text-white' :
                            presupuesto.subestado === 'En espera' ? 'bg-yellow-500 text-black' :
                            'bg-blue-100 text-blue-800') :
                         presupuesto.estado === 'Aceptado' ? 'bg-green-100 text-green-800' :
                         presupuesto.estado === 'Rechazado' ? 'bg-red-100 text-red-800' :
                         'bg-gray-100 text-gray-800'
                       }`}>
                         <span className="whitespace-nowrap text-xs">
                           {presupuesto.estado || 'Abierto'}
                           {presupuesto.estado === 'Abierto' && presupuesto.subestado && (
                             <span className="ml-1">
                               ({presupuesto.subestado})
                             </span>
                           )}
                         </span>
                       </span>
                     </td>
                     <td className="font-medium text-green-400 text-xs w-24">
                       {formatCurrency(presupuesto.importe)}
                     </td>
                    <td className="font-medium text-blue-400 text-xs w-20">
                      {(() => {
                        const margenServidor = presupuesto.margen;
                        const margenEsValido = Number.isFinite(margenServidor);
                        if (margenEsValido) {
                          return formatMargin(margenServidor);
                        }
                        // Fallback: recalcular con totales de piezas si el margen no viene calculado
                        const importeFallback = calcularImporteTotal(presupuesto);
                        const costoFallback = calcularCostoTotal(presupuesto);
                        const margenCalc = calculateMargin(importeFallback, costoFallback);
                        return formatMargin(margenCalc);
                      })()}
                    </td>
                     <td className="text-slate-400 text-xs w-24 truncate">{typeof presupuesto.usuario === 'object' ? JSON.stringify(presupuesto.usuario) : presupuesto.usuario}</td>
                     <td className="text-center w-12">
                       {presupuesto.estado !== 'Aceptado' ? (
                         <Circle className="w-4 h-4 mx-auto text-slate-400" />
                       ) : !presupuesto.orSiniestro || presupuesto.orSiniestro.trim() === '' ? (
                         <X className="w-4 h-4 mx-auto text-red-500" />
                       ) : (
                         <Check className="w-4 h-4 mx-auto text-green-500" />
                       )}
                     </td>
                    <td className="w-20">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => window.open(`/presupuestos/${presupuesto.referencia}`, '_blank')}
                          className="p-0.5 text-slate-400 hover:text-blue-400"
                          title="Ver detalles"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <div className="flex items-center space-x-0.5 text-slate-400">
                          <MessageSquare className="w-3 h-3" />
                          <span className="text-xs font-medium">
                            {presupuesto.comentarios?.length || 0}
                          </span>
                        </div>
                        {presupuesto.adjuntos && presupuesto.adjuntos.length > 0 && (
                          <div 
                            className="flex items-center space-x-0.5 text-green-400" 
                            title={`${presupuesto.adjuntos.length} archivo(s) adjunto(s):\n${presupuesto.adjuntos.map(a => a.nombreOriginal).join('\n')}`}
                          >
                            <Paperclip className="w-3 h-3" />
                            <span className="text-xs font-medium">
                              {presupuesto.adjuntos.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                                 <tr>
                   <td colSpan="11" className="text-center py-8 text-slate-400">
                     <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                     <p>No se encontraron presupuestos</p>
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      <Pagination />
    </div>
  );
};

export default Presupuestos;
