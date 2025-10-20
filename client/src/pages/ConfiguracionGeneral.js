import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Settings as SettingsIcon,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader,
  Info,
  Folder
} from 'lucide-react';
import { configuracionGeneralAPI, formatError } from '../services/api';

const ConfiguracionGeneral = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    diasParaPendiente: 2, // Por defecto 2 días (48 horas)
    directorioAdjuntos: 'server/uploads/adjuntos', // Directorio por defecto para archivos adjuntos
  });
  const [saveResult, setSaveResult] = useState(null);
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Consulta para obtener configuración general actual
  const { data: configuracion, isLoading } = useQuery(
    'configuracion-general',
    () => configuracionGeneralAPI.getConfiguracionGeneral().then(res => res.data.configuracion),
    {
      staleTime: 0,
      cacheTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }
  );

  // Mutación para actualizar configuración general
  const updateConfigMutation = useMutation(
    (data) => configuracionGeneralAPI.updateConfiguracionGeneral(data),
    {
      onSuccess: (response) => {
        // Solo actualizar el cache, no invalidar la query
        queryClient.setQueryData('configuracion-general', response.data.configuracion);
        setSaveResult({ success: true, message: 'Configuración guardada correctamente' });
        
        // Limpiar el mensaje después de 3 segundos
        setTimeout(() => setSaveResult(null), 3000);
      },
      onError: (error) => {
        console.error('Error en mutación de configuración:', error);
        // Solo mostrar errores que no sean de red temporal
        if (error.message !== 'Network Error' && error.code !== 'NETWORK_ERROR') {
          setSaveResult({ success: false, message: `Error al guardar: ${formatError(error)}` });
          setTimeout(() => setSaveResult(null), 5000);
        }
      },
    }
  );

  // Efecto para sincronizar el estado local con los datos de la query
  useEffect(() => {
    if (configuracion) {
      setFormData({
        diasParaPendiente: configuracion.diasParaPendiente || 2,
        directorioAdjuntos: configuracion.directorioAdjuntos || 'server/uploads/adjuntos',
      });
    }
  }, [configuracion]); // Simplificado para actualizarse siempre que cambie la configuración

  // Limpiar el timer cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Función para manejar cambios en el formulario y guardar automáticamente
  const handleInputChange = (field, value) => {
    let finalValue = value;
    let isValid = true;
    
    // Si el campo es diasParaPendiente, validar que sea un número válido
    if (field === 'diasParaPendiente') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 1 || numValue > 30) {
        isValid = false;
        return; // No actualizar ni guardar
      }
      finalValue = numValue;
    }
    
    // Si el campo es directorioAdjuntos, validar que no esté vacío
    if (field === 'directorioAdjuntos') {
      if (!value || value.trim() === '') {
        isValid = false;
        return; // No actualizar ni guardar
      }
      finalValue = value.trim();
    }
    
    // Actualizar el estado local inmediatamente para feedback visual
    setFormData(prev => ({ ...prev, [field]: finalValue }));
    
    // Limpiar el timer anterior si existe
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Crear un nuevo timer para guardar después de 1.5 segundos de inactividad
    const timer = setTimeout(() => {
      if (isValid) {
        // Verificar que el servidor esté disponible antes de hacer la llamada
        updateConfigMutation.mutate({ [field]: finalValue }, {
          onError: (error) => {
            console.error('Error al guardar configuración:', error);
            // No mostrar error si es un problema de red temporal
            if (error.message !== 'Network Error') {
              setSaveResult({ success: false, message: `Error al guardar: ${formatError(error)}` });
              setTimeout(() => setSaveResult(null), 5000);
            }
          }
        });
      }
    }, 1500);
    
    setDebounceTimer(timer);
  };

  // Componente para mostrar resultado de guardado
  const SaveResult = () => {
    if (!saveResult) return null;

    return (
      <div className={`p-4 rounded-lg border mb-6 ${
        saveResult.success 
          ? 'bg-green-900/20 border-green-600 text-green-300' 
          : 'bg-red-900/20 border-red-600 text-red-300'
      }`}>
        <div className="flex items-center space-x-2">
          {saveResult.success ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400" />
          )}
          <span className="font-medium">{saveResult.message}</span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Configuración General</h1>
          <p className="text-slate-400 mt-1">
            Configuración general del sistema de presupuestos
          </p>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <SettingsIcon className="w-6 h-6" />
        </div>
      </div>

      {/* Resultado de guardado */}
      <SaveResult />

      {/* Configuración de Subestados */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Clock className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-white">Configuración de Subestados</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Período para cambio a "Pendiente" (días)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="30"
                value={formData.diasParaPendiente}
                onChange={(e) => handleInputChange('diasParaPendiente', parseInt(e.target.value))}
                className="input w-32 pr-10"
                disabled={updateConfigMutation.isLoading}
              />
              {updateConfigMutation.isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader className="w-4 h-4 animate-spin text-blue-500" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Número de días desde la creación o último comentario para que un presupuesto "En espera" pase a "Pendiente". 
              <span className="text-blue-400 font-medium"> Los cambios se guardan automáticamente.</span>
            </p>
          </div>

          {/* Información sobre los subestados */}
          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center space-x-2">
              <Info className="w-5 h-5" />
              <span>Información sobre Subestados</span>
            </h3>
            <div className="space-y-2 text-sm text-blue-200">
              <p>• <strong>En espera:</strong> Presupuestos abiertos donde no han pasado {formData.diasParaPendiente} días desde la creación o último comentario</p>
              <p>• <strong>Pendiente:</strong> Presupuestos abiertos donde han pasado más de {formData.diasParaPendiente} días desde la creación o último comentario</p>
              <p>• <strong>Fecha de referencia:</strong> Se usa la fecha más reciente entre la creación del presupuesto y el último comentario</p>
              <p>• <strong>Actualización automática:</strong> Los subestados se calculan automáticamente cada vez que se consultan los presupuestos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración de Archivos Adjuntos */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Folder className="w-6 h-6 text-green-500" />
          <h2 className="text-xl font-semibold text-white">Configuración de Archivos Adjuntos</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Directorio de almacenamiento
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.directorioAdjuntos}
                onChange={(e) => handleInputChange('directorioAdjuntos', e.target.value)}
                className="input w-full"
                placeholder="server/uploads/adjuntos"
                disabled={updateConfigMutation.isLoading}
              />
              {updateConfigMutation.isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader className="w-4 h-4 animate-spin text-blue-500" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ruta del directorio donde se almacenarán los archivos adjuntos de los presupuestos.
              <span className="text-blue-400 font-medium"> Los cambios se guardan automáticamente.</span>
            </p>
          </div>

          {/* Información sobre archivos adjuntos */}
          <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-300 mb-3 flex items-center space-x-2">
              <Info className="w-5 h-5" />
              <span>Información sobre Archivos Adjuntos</span>
            </h3>
            <div className="space-y-2 text-sm text-green-200">
              <p>• <strong>Tipos permitidos:</strong> Cualquier tipo de archivo (imágenes, documentos, PDFs, etc.)</p>
              <p>• <strong>Tamaño máximo:</strong> 50 MB por archivo</p>
              <p>• <strong>Cantidad:</strong> Sin límite de archivos por presupuesto</p>
              <p>• <strong>Seguridad:</strong> Los archivos se almacenan con nombres únicos generados automáticamente</p>
              <p>• <strong>Directorio:</strong> Si no existe, se creará automáticamente al subir el primer archivo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración actual */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Configuración Actual</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700 p-4 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Período para Pendiente</p>
            <p className="text-2xl font-bold text-white">
              {formData.diasParaPendiente} {formData.diasParaPendiente === 1 ? 'día' : 'días'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              ({formData.diasParaPendiente * 24} horas)
            </p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Directorio Adjuntos</p>
            <p className="text-sm font-semibold text-white break-all">
              {formData.directorioAdjuntos}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Ubicación de archivos
            </p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Estado del Sistema</p>
            <p className="text-lg font-semibold text-green-400">Activo</p>
            <p className="text-sm text-slate-400 mt-1">
              Configuración aplicada
            </p>
          </div>
        </div>
      </div>


      {/* Información adicional */}
      <div className="card p-6 bg-yellow-900/20 border-yellow-600">
        <h3 className="text-lg font-semibold text-yellow-300 mb-3">⚠️ Importante</h3>
        <div className="space-y-2 text-sm text-yellow-200">
          <p>• Los cambios se guardan automáticamente al modificar el valor</p>
          <p>• Los cambios afectarán inmediatamente a todos los presupuestos abiertos</p>
          <p>• Se recomienda un período entre 1 y 7 días para mantener la gestión efectiva</p>
          <p>• Un período muy corto (1 día) puede marcar presupuestos como pendientes muy rápidamente</p>
          <p>• Un período muy largo (más de 7 días) puede retrasar el seguimiento de presupuestos olvidados</p>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionGeneral;
