import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Building,
  Save,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { talleresAPI, formatError } from '../services/api';

const GestionTalleres = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [tallerInputs, setTallerInputs] = useState({});

  // Consultas
  const { data: talleres, isLoading, error, refetch } = useQuery(
    'talleres',
    () => talleresAPI.getTalleres().then(res => res.data),
    { staleTime: 5 * 60 * 1000 }
  );

  const { data: codigosUnicos } = useQuery(
    'codigosUnicos',
    () => talleresAPI.getCodigosUnicos().then(res => res.data),
    { staleTime: 10 * 60 * 1000 }
  );

  // Cargar nombres existentes en los inputs cuando se carguen los datos
  useEffect(() => {
    if (talleres && codigosUnicos) {
      const inputsIniciales = {};
      codigosUnicos.forEach(codigo => {
        const tallerExistente = talleres.find(t => t.codigo === codigo.toString());
        if (tallerExistente) {
          inputsIniciales[codigo] = tallerExistente.nombre;
        }
      });
      setTallerInputs(inputsIniciales);
    }
  }, [talleres, codigosUnicos]);

  // Mutaciones
  const guardarTodosMutation = useMutation(
    async (talleresData) => {
      const promises = talleresData.map(async (taller) => {
        if (taller.nombre && taller.nombre.trim()) {
          try {
            // Intentar crear primero
            await talleresAPI.crearTaller(taller);
          } catch (error) {
            // Si ya existe, actualizar
            if (error.response?.status === 400 && error.response?.data?.error?.includes('Ya existe')) {
              await talleresAPI.actualizarTaller(taller.codigo, { nombre: taller.nombre });
            } else {
              throw error;
            }
          }
        }
      });
      await Promise.all(promises);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('talleres');
        setTallerInputs({});
      }
    }
  );

  // Filtrar códigos por búsqueda
  const codigosFiltrados = codigosUnicos?.filter(codigo => 
    codigo.toString().toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Función para manejar cambios en los inputs
  const handleInputChange = (codigo, nombre) => {
    setTallerInputs(prev => ({
      ...prev,
      [codigo]: nombre
    }));
  };

  // Función para guardar todos los talleres
  const handleGuardarTodos = async () => {
    const talleresParaGuardar = codigosFiltrados.map(codigo => ({
      codigo: codigo.toString(),
      nombre: tallerInputs[codigo] || ''
    })).filter(taller => taller.nombre && taller.nombre.trim());

    if (talleresParaGuardar.length === 0) {
      alert('Por favor, ingresa al menos un nombre de taller');
      return;
    }

    try {
      await guardarTodosMutation.mutateAsync(talleresParaGuardar);
      alert('Talleres guardados correctamente');
    } catch (error) {
      alert(`Error al guardar talleres: ${formatError(error)}`);
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">
          <AlertTriangle className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Error al cargar talleres
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
          <h1 className="text-3xl font-bold text-white">Gestión de Talleres</h1>
          <p className="text-slate-400 mt-1">
            Configura los códigos y nombres de los talleres
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="btn-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </button>
          <button
            onClick={handleGuardarTodos}
            disabled={guardarTodosMutation.isLoading}
            className="btn-primary"
          >
            {guardarTodosMutation.isLoading ? (
              <div className="spinner w-4 h-4 mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar Todos
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <Building className="w-8 h-8 text-blue-400 mr-3" />
            <div>
              <p className="text-sm text-slate-400">Total Códigos</p>
              <p className="text-2xl font-bold text-white">
                {codigosUnicos?.length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-400 mr-3" />
            <div>
              <p className="text-sm text-slate-400">Configurados</p>
              <p className="text-2xl font-bold text-white">
                {talleres?.filter(t => t.activo).length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-yellow-400 mr-3" />
            <div>
              <p className="text-sm text-slate-400">Sin Configurar</p>
              <p className="text-2xl font-bold text-white">
                {codigosUnicos?.filter(codigo => 
                  !talleres?.some(t => t.codigo === codigo && t.activo)
                ).length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Tabla de talleres - Dos columnas */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-1/3">Código de Taller</th>
                <th className="w-2/3">Nombre del Taller</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="2" className="text-center py-8">
                    <div className="spinner w-6 h-6 mx-auto"></div>
                  </td>
                </tr>
              ) : codigosFiltrados.length > 0 ? (
                codigosFiltrados.map((codigo) => {
                  return (
                    <tr key={codigo}>
                      <td className="font-mono text-blue-400 font-bold">
                        {codigo}
                      </td>
                                             <td>
                         <input
                           type="text"
                           value={tallerInputs[codigo] || ''}
                           onChange={(e) => handleInputChange(codigo, e.target.value)}
                           placeholder="Ingresa el nombre del taller..."
                           className="input w-1/4"
                         />
                       </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="2" className="text-center py-8 text-slate-400">
                    <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron códigos de talleres</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GestionTalleres;
