import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Upload, 
  Database, 
  CheckCircle, 
  AlertTriangle,
  Loader,
  RefreshCw,
  Info,
  Settings,
  FileSpreadsheet,
  Save,
  TestTube,
  Clock,
  Play,
  Pause,
  Calendar,
  Activity
} from 'lucide-react';
import { uploadAPI, configuracionAPI, schedulerAPI, formatError } from '../services/api';

const CargaExcel = () => {
  const queryClient = useQueryClient();
  const [uploadData, setUploadData] = useState({});
  const [uploadResult, setUploadResult] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [testResults, setTestResults] = useState({});
  
  // Estados para el formulario de configuración
  const [formData, setFormData] = useState({
    uri: '',
    database: '',
    collection: '',
    excelPath: '',
    excelSheet: '',
  });

  // Estados para el scheduler
  const [schedulerConfig, setSchedulerConfig] = useState({
    interval: '0 */30 * * * *', // Cada 30 minutos
    enabled: false
  });

  // Consulta para obtener configuración actual
  const { data: configuracion, isLoading: loadingConfig } = useQuery(
    'configuracion',
    () => configuracionAPI.getConfiguracion().then(res => res.data),
    {
      staleTime: 0,
      cacheTime: 0,
    }
  );

  // Consulta para obtener estado del scheduler
  const { data: schedulerStatus, refetch: refetchScheduler } = useQuery(
    'scheduler-status',
    () => schedulerAPI.getStatus().then(res => res.data),
    {
      refetchInterval: 5000, // Refrescar cada 5 segundos
      staleTime: 0,
    }
  );

  // Efecto para sincronizar el estado local con los datos de la query
  useEffect(() => {
    if (configuracion) {
      setFormData(configuracion);
    }
  }, [configuracion]);

  // Efecto para sincronizar configuración del scheduler
  useEffect(() => {
    if (schedulerStatus?.config) {
      setSchedulerConfig(schedulerStatus.config);
    }
  }, [schedulerStatus]);

  // Mutación para cargar desde configuración
  const uploadFromConfigMutation = useMutation(
    () => uploadAPI.uploadFromConfig(),
    {
      onSuccess: (response) => {
        // Extraer solo los datos de la respuesta
        setUploadResult(response.data);
        queryClient.invalidateQueries('estadisticas');
        queryClient.invalidateQueries('presupuestos');
        queryClient.invalidateQueries('porTipoSiniestro');
      },
      onError: (error) => {
        console.error('❌ Error en la carga:', error);
        setUploadResult({
          success: false,
          error: formatError(error),
        });
      },
    }
  );

  // Mutación para actualizar configuración
  const updateConfigMutation = useMutation(
    (data) => configuracionAPI.updateConfiguracion(data),
    {
      onSuccess: (response) => {
        queryClient.setQueryData('configuracion', response.data.configuracion);
        queryClient.invalidateQueries('configuracion');
        setFormData(response.data.configuracion);
        alert('Configuración actualizada correctamente');
      },
      onError: (error) => {
        alert(`Error al actualizar configuración: ${formatError(error)}`);
      },
    }
  );

  // Mutación para probar conexión MongoDB
  const testConnectionMutation = useMutation(
    (data) => configuracionAPI.testConnection(data),
    {
      onSuccess: (data) => {
        setTestResults(prev => ({
          ...prev,
          connection: {
            success: true,
            message: data.message || 'Conexión exitosa',
            details: data.details || ''
          }
        }));
      },
      onError: (error) => {
        setTestResults(prev => ({
          ...prev,
          connection: {
            success: false,
            message: formatError(error),
            details: ''
          }
        }));
      },
    }
  );

  // Mutación para probar archivo Excel
  const testExcelMutation = useMutation(
    (data) => configuracionAPI.testExcel(data),
    {
      onSuccess: (data) => {
        setTestResults(prev => ({
          ...prev,
          excel: {
            success: true,
            message: data.message || 'Archivo Excel válido',
            details: data.details || ''
          }
        }));
      },
      onError: (error) => {
        setTestResults(prev => ({
          ...prev,
          excel: {
            success: false,
            message: formatError(error),
            details: ''
          }
        }));
      },
    }
  );



  // Función para cargar desde configuración
  const handleUploadFromConfig = () => {
    uploadFromConfigMutation.mutate();
  };

  // Función para limpiar resultados
  const clearResults = () => {
    setUploadResult(null);
  };

  // Funciones para manejar configuración
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para manejar cambios en el formulario (versión con parámetros)
  const handleInputChangeParam = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Función para guardar configuración
  const handleSave = () => {
    updateConfigMutation.mutate(formData);
  };


  const handleSaveConfig = () => {
    updateConfigMutation.mutate(formData);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate(formData);
  };

  const handleTestExcel = () => {
    testExcelMutation.mutate(formData);
  };

  // Mutaciones para el scheduler
  const startSchedulerMutation = useMutation(
    () => schedulerAPI.start(),
    {
      onSuccess: () => {
        refetchScheduler();
        alert('Scheduler iniciado correctamente');
      },
      onError: (error) => {
        alert(`Error al iniciar scheduler: ${formatError(error)}`);
      },
    }
  );

  const stopSchedulerMutation = useMutation(
    () => schedulerAPI.stop(),
    {
      onSuccess: () => {
        refetchScheduler();
        alert('Scheduler detenido correctamente');
      },
      onError: (error) => {
        alert(`Error al detener scheduler: ${formatError(error)}`);
      },
    }
  );

  const updateSchedulerConfigMutation = useMutation(
    (data) => schedulerAPI.updateConfig(data),
    {
      onSuccess: () => {
        refetchScheduler();
        alert('Configuración del scheduler actualizada');
      },
      onError: (error) => {
        alert(`Error al actualizar configuración: ${formatError(error)}`);
      },
    }
  );

  const executeSchedulerMutation = useMutation(
    () => schedulerAPI.execute(),
    {
      onSuccess: () => {
        refetchScheduler();
        queryClient.invalidateQueries('estadisticas');
        queryClient.invalidateQueries('presupuestos');
        alert('Carga automática ejecutada manualmente');
      },
      onError: (error) => {
        alert(`Error al ejecutar carga: ${formatError(error)}`);
      },
    }
  );

  // Función para formatear números
  const formatNumber = (num) => {
    return new Intl.NumberFormat('es-AR').format(num);
  };

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Funciones para manejar scheduler
  const handleSchedulerInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSchedulerConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleStartScheduler = () => {
    startSchedulerMutation.mutate();
  };

  const handleStopScheduler = () => {
    stopSchedulerMutation.mutate();
  };

  const handleSaveSchedulerConfig = () => {
    updateSchedulerConfigMutation.mutate(schedulerConfig);
  };

  const handleExecuteScheduler = () => {
    executeSchedulerMutation.mutate();
  };

  // Función para formatear próxima ejecución
  const formatNextExecution = (dateString) => {
    if (!dateString) return 'No programado';
    const date = new Date(dateString);
    return date.toLocaleString('es-AR');
  };

  // Función para obtener descripción del intervalo
  const getIntervalDescription = (interval) => {
    const descriptions = {
      '0 */5 * * * *': 'Cada 5 minutos',
      '0 */10 * * * *': 'Cada 10 minutos',
      '0 */15 * * * *': 'Cada 15 minutos',
      '0 */30 * * * *': 'Cada 30 minutos',
      '0 0 * * * *': 'Cada hora',
      '0 0 */2 * * *': 'Cada 2 horas',
      '0 0 */6 * * *': 'Cada 6 horas',
      '0 0 0 * * *': 'Diariamente a medianoche',
      '0 0 9 * * *': 'Diariamente a las 9:00 AM',
      '0 0 18 * * *': 'Diariamente a las 6:00 PM'
    };
    return descriptions[interval] || interval;
  };

  // Componente para mostrar resultados
  const UploadResults = ({ result }) => {
    if (!result) return null;

    if (!result.success) {
      return (
        <div className="card p-6 bg-red-900/20 border-red-600">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h3 className="text-lg font-semibold text-red-300">Error en la Carga</h3>
          </div>
          <p className="text-red-200">{result.error}</p>
        </div>
      );
    }

    const { estadisticas, errores, referenciasExistentes } = result;

    return (
      <div className="space-y-6">
        {/* Resumen de resultados */}
        <div className="card p-6 bg-green-900/20 border-green-600">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-semibold text-green-300">Carga Completada</h3>
          </div>
          <p className="text-green-200 mb-4">{result.message}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-800/30 p-3 rounded-lg">
              <p className="text-xs text-green-300 uppercase tracking-wide">Total Filas</p>
              <p className="text-lg font-bold text-green-100">{formatNumber(estadisticas.totalFilas)}</p>
            </div>
            <div className="bg-blue-800/30 p-3 rounded-lg">
              <p className="text-xs text-blue-300 uppercase tracking-wide">Nuevos</p>
              <p className="text-lg font-bold text-blue-100">{formatNumber(estadisticas.referenciasNuevas)}</p>
            </div>
            <div className="bg-yellow-800/30 p-3 rounded-lg">
              <p className="text-xs text-yellow-300 uppercase tracking-wide">Existentes</p>
              <p className="text-lg font-bold text-yellow-100">{formatNumber(estadisticas.referenciasExistentes)}</p>
            </div>
            <div className="bg-red-800/30 p-3 rounded-lg">
              <p className="text-xs text-red-300 uppercase tracking-wide">Errores</p>
              <p className="text-lg font-bold text-red-100">{formatNumber(estadisticas.errores)}</p>
            </div>
          </div>
        </div>

        {/* Errores detallados */}
        {errores && errores.length > 0 && (
          <div className="card p-6">
            <h4 className="text-lg font-semibold text-white mb-4">Errores Encontrados</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {errores.map((error, index) => (
                <div key={index} className="bg-red-900/20 p-3 rounded-lg border border-red-600">
                  <p className="text-sm text-red-300">
                    <strong>Fila {error.fila}:</strong> {error.error}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referencias existentes */}
        {referenciasExistentes && referenciasExistentes.length > 0 && (
          <div className="card p-6">
            <h4 className="text-lg font-semibold text-white mb-4">Referencias Existentes (Omitidas)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {referenciasExistentes.map((ref, index) => (
                <div key={index} className="bg-yellow-900/20 p-2 rounded text-center">
                  <span className="text-xs text-yellow-300 font-mono">{ref}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Componente para mostrar resultados de pruebas
  const TestResult = ({ type, result }) => {
    if (!result) return null;

    return (
      <div className={`p-4 rounded-lg border ${
        result.success 
          ? 'bg-green-900/20 border-green-600 text-green-300' 
          : 'bg-red-900/20 border-red-600 text-red-300'
      }`}>
        <div className="flex items-center space-x-2 mb-2">
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400" />
          )}
          <span className="font-medium">
            {type === 'connection' ? 'Conexión MongoDB' : 'Archivo Excel'}
          </span>
        </div>
        <p className="text-sm">{result.message}</p>
        {result.success && result.data && type === 'excel' && (
          <div className="mt-3 text-xs">
            <p><strong>Hojas disponibles:</strong> {result.data.sheetNames?.join(', ')}</p>
            <p><strong>Hoja actual:</strong> {result.data.currentSheet}</p>
            <p><strong>Total de filas:</strong> {result.data.totalRows}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Actualización de datos</h1>
          <p className="text-slate-400 mt-1">
            Configuración del sistema, carga de datos desde archivo Excel y programador automático
          </p>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <Upload className="w-6 h-6" />
        </div>
      </div>

      {/* Sección de Configuración */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración de Base de Datos */}
        <div className="card p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Database className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-white">Base de Datos MongoDB</h2>
          </div>

          <div className="space-y-4">
            {/* URI de MongoDB */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                URI de MongoDB *
              </label>
              <input
                type="text"
                value={formData.uri}
                onChange={(e) => handleInputChangeParam('uri', e.target.value)}
                placeholder="mongodb://localhost:27017"
                className="input"
              />
              <p className="text-xs text-slate-500 mt-1">
                Ejemplo: mongodb://usuario:contraseña@servidor:puerto
              </p>
            </div>

            {/* Nombre de la base de datos */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre de la Base de Datos *
              </label>
              <input
                type="text"
                value={formData.database}
                onChange={(e) => handleInputChangeParam('database', e.target.value)}
                placeholder="oc_presup_crm"
                className="input"
              />
            </div>

            {/* Nombre de la colección */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre de la Colección *
              </label>
              <input
                type="text"
                value={formData.collection}
                onChange={(e) => handleInputChangeParam('collection', e.target.value)}
                placeholder="presupuestos"
                className="input"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex items-center space-x-3 pt-4">
              <button
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isLoading || !formData.uri || !formData.database}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {testConnectionMutation.isLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                <span>Probar Conexión</span>
              </button>
            </div>

            {/* Resultado de prueba de conexión */}
            <TestResult type="connection" result={testResults.connection} />
          </div>
        </div>

        {/* Configuración de Archivo Excel */}
        <div className="card p-6">
          <div className="flex items-center space-x-2 mb-6">
            <FileSpreadsheet className="w-6 h-6 text-green-500" />
            <h2 className="text-xl font-semibold text-white">Archivo Excel</h2>
          </div>

          <div className="space-y-4">
            {/* Ruta del archivo Excel */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Ruta del Archivo Excel
              </label>
              <input
                type="text"
                value={formData.excelPath}
                onChange={(e) => handleInputChangeParam('excelPath', e.target.value)}
                placeholder="C:\ruta\al\archivo.xlsx"
                className="input"
              />
              <p className="text-xs text-slate-500 mt-1">
                Ruta completa al archivo Excel (opcional)
              </p>
            </div>

            {/* Nombre de la hoja */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre de la Hoja (Opcional)
              </label>
              <input
                type="text"
                value={formData.excelSheet}
                onChange={(e) => handleInputChangeParam('excelSheet', e.target.value)}
                placeholder="Hoja1"
                className="input"
              />
              <p className="text-xs text-slate-500 mt-1">
                Si no se especifica, se usará la primera hoja
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center space-x-3 pt-4">
              <button
                onClick={handleTestExcel}
                disabled={testExcelMutation.isLoading || !formData.excelPath}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {testExcelMutation.isLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                <span>Probar Excel</span>
              </button>
            </div>

            {/* Resultado de prueba de Excel */}
            <TestResult type="excel" result={testResults.excel} />
          </div>
        </div>
      </div>

      {/* Configuración actual */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Configuración Actual</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-700 p-3 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wide">URI MongoDB</p>
            <p className="text-sm text-white font-mono break-all">{configuracion?.uri || 'No configurado'}</p>
          </div>
          <div className="bg-slate-700 p-3 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Base de Datos</p>
            <p className="text-sm text-white font-mono">{configuracion?.database || 'No configurado'}</p>
          </div>
          <div className="bg-slate-700 p-3 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Colección</p>
            <p className="text-sm text-white font-mono">{configuracion?.collection || 'No configurado'}</p>
          </div>
          <div className="bg-slate-700 p-3 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Archivo Excel</p>
            <p className="text-sm text-white font-mono break-all">{configuracion?.excelPath || 'No configurado'}</p>
          </div>
          <div className="bg-slate-700 p-3 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Hoja Excel</p>
            <p className="text-sm text-white font-mono">{configuracion?.excelSheet || 'Primera hoja'}</p>
          </div>
        </div>
      </div>

      {/* Botón de guardar configuración */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateConfigMutation.isLoading}
          className="btn-primary flex items-center space-x-2 disabled:opacity-50"
        >
          {updateConfigMutation.isLoading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Guardar Configuración</span>
        </button>
      </div>

      {/* Información adicional */}
      <div className="card p-6 bg-blue-900/20 border-blue-600">
        <h3 className="text-lg font-semibold text-blue-300 mb-3">Información Importante</h3>
        <div className="space-y-2 text-sm text-blue-200">
          <p>• La configuración se guarda localmente en el servidor</p>
          <p>• El archivo Excel debe tener las columnas: Referencia, Fecha, CTA, NOMBRE, Taller, Pieza, Concepto, COSTO, PVP, Importe, Usuario, Descripcion siniestro</p>
          <p>• Las referencias duplicadas se omitirán automáticamente durante la carga</p>
          <p>• Se recomienda probar la conexión y el archivo antes de realizar cargas masivas</p>
        </div>
      </div>

      {/* Carga desde configuración */}
      <div className="card p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Database className="w-6 h-6 text-green-500" />
          <h2 className="text-xl font-semibold text-white">Carga desde Configuración</h2>
        </div>

        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            Utiliza la configuración guardada en el sistema para cargar el archivo Excel.
            Asegúrate de haber configurado correctamente la ruta del archivo en la sección de Configuración.
          </p>

          <div className="flex space-x-3">
            <button
              onClick={handleUploadFromConfig}
              disabled={uploadFromConfigMutation.isLoading}
              className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {uploadFromConfigMutation.isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Carga manual</span>
            </button>
            
            <button
              onClick={() => setShowScheduler(!showScheduler)}
              className="btn-secondary flex-1 flex items-center justify-center space-x-2"
            >
              <Clock className="w-4 h-4" />
              <span>{showScheduler ? 'Ocultar' : 'Scheduler'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Configuración Automática */}
      {showConfig && (
        <div className="card p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Settings className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-white">Configuración Automática</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuración de Base de Datos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Database className="w-5 h-5 text-green-400" />
                <span>Base de Datos</span>
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    URI de Conexión MongoDB
                  </label>
                  <input
                    type="text"
                    name="uri"
                    value={formData.uri}
                    onChange={handleInputChange}
                    placeholder="mongodb://localhost:27017"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre de la Base de Datos
                  </label>
                  <input
                    type="text"
                    name="database"
                    value={formData.database}
                    onChange={handleInputChange}
                    placeholder="Presupuestos"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Colección
                  </label>
                  <input
                    type="text"
                    name="collection"
                    value={formData.collection}
                    onChange={handleInputChange}
                    placeholder="presupuestos"
                    className="input"
                  />
                </div>

                <button
                  onClick={handleTestConnection}
                  disabled={testConnectionMutation.isLoading}
                  className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {testConnectionMutation.isLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  <span>Probar Conexión</span>
                </button>

                {testResults.connection && (
                  <div className={`p-3 rounded-lg flex items-center space-x-2 ${
                    testResults.connection.success 
                      ? 'bg-green-900/20 border border-green-600' 
                      : 'bg-red-900/20 border border-red-600'
                  }`}>
                    {testResults.connection.success ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm ${
                      testResults.connection.success ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {testResults.connection.message}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Configuración de Archivo Excel */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                <span>Archivo Excel</span>
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Ruta del Archivo Excel
                  </label>
                  <input
                    type="text"
                    name="excelPath"
                    value={formData.excelPath}
                    onChange={handleInputChange}
                    placeholder="C:\ruta\al\archivo.xlsx"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre de la Hoja
                  </label>
                  <input
                    type="text"
                    name="excelSheet"
                    value={formData.excelSheet}
                    onChange={handleInputChange}
                    placeholder="Primera hoja"
                    className="input"
                  />
                </div>

                <button
                  onClick={handleTestExcel}
                  disabled={testExcelMutation.isLoading}
                  className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {testExcelMutation.isLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  <span>Probar Archivo Excel</span>
                </button>

                {testResults.excel && (
                  <div className={`p-3 rounded-lg flex items-center space-x-2 ${
                    testResults.excel.success 
                      ? 'bg-green-900/20 border border-green-600' 
                      : 'bg-red-900/20 border border-red-600'
                  }`}>
                    {testResults.excel.success ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm ${
                      testResults.excel.success ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {testResults.excel.message}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botón de Guardar Configuración */}
          <div className="mt-6 pt-6 border-t border-slate-600">
            <button
              onClick={handleSaveConfig}
              disabled={updateConfigMutation.isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {updateConfigMutation.isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>
      )}

      {/* Scheduler Automático */}
      {showScheduler && (
        <div className="card p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Clock className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-semibold text-white">Scheduler Automático</h2>
          </div>

          {/* Estado del Scheduler */}
          <div className="mb-6 p-4 bg-slate-800 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <span>Estado Actual</span>
              </h3>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                schedulerStatus?.isRunning 
                  ? 'bg-green-900/20 text-green-300 border border-green-600' 
                  : 'bg-red-900/20 text-red-300 border border-red-600'
              }`}>
                {schedulerStatus?.isRunning ? '🟢 Ejecutándose' : '🔴 Detenido'}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Intervalo:</span>
                <p className="text-white font-medium">
                  {getIntervalDescription(schedulerConfig.interval)}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Próxima ejecución:</span>
                <p className="text-white font-medium">
                  {formatNextExecution(schedulerStatus?.nextExecution)}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Archivo configurado:</span>
                <p className="text-white font-medium truncate">
                  {configuracion?.excelPath ? '✅ Configurado' : '❌ No configurado'}
                </p>
              </div>
            </div>
          </div>

          {/* Controles del Scheduler */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuración */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Settings className="w-5 h-5 text-purple-400" />
                <span>Configuración</span>
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Intervalo de Ejecución
                  </label>
                  <select
                    name="interval"
                    value={schedulerConfig.interval}
                    onChange={handleSchedulerInputChange}
                    className="input"
                  >
                    <option value="0 */5 * * * *">Cada 5 minutos</option>
                    <option value="0 */10 * * * *">Cada 10 minutos</option>
                    <option value="0 */15 * * * *">Cada 15 minutos</option>
                    <option value="0 */30 * * * *">Cada 30 minutos</option>
                    <option value="0 0 * * * *">Cada hora</option>
                    <option value="0 0 */2 * * *">Cada 2 horas</option>
                    <option value="0 0 */6 * * *">Cada 6 horas</option>
                    <option value="0 0 0 * * *">Diariamente a medianoche</option>
                    <option value="0 0 9 * * *">Diariamente a las 9:00 AM</option>
                    <option value="0 0 18 * * *">Diariamente a las 6:00 PM</option>
                  </select>
                </div>

                <div className="p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
                  <p className="text-sm text-blue-200">
                    <strong>📁 Archivo Excel:</strong> El scheduler utilizará automáticamente la configuración del archivo Excel 
                    establecida en la sección de <strong>Configuración General</strong>.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="enabled"
                    checked={schedulerConfig.enabled}
                    onChange={handleSchedulerInputChange}
                    className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm text-slate-300">
                    Habilitar scheduler automático
                  </label>
                </div>

                <button
                  onClick={handleSaveSchedulerConfig}
                  disabled={updateSchedulerConfigMutation.isLoading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {updateSchedulerConfigMutation.isLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Guardar Configuración</span>
                </button>
              </div>
            </div>

            {/* Controles */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Play className="w-5 h-5 text-green-400" />
                <span>Controles</span>
              </h3>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleStartScheduler}
                    disabled={startSchedulerMutation.isLoading || schedulerStatus?.isRunning}
                    className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {startSchedulerMutation.isLoading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>Iniciar</span>
                  </button>

                  <button
                    onClick={handleStopScheduler}
                    disabled={stopSchedulerMutation.isLoading || !schedulerStatus?.isRunning}
                    className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {stopSchedulerMutation.isLoading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                    <span>Detener</span>
                  </button>
                </div>

                <button
                  onClick={handleExecuteScheduler}
                  disabled={executeSchedulerMutation.isLoading}
                  className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {executeSchedulerMutation.isLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>Ejecutar Ahora</span>
                </button>

                <div className="p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
                  <p className="text-sm text-blue-200">
                    <strong>💡 Tip:</strong> El scheduler ejecutará automáticamente la carga del archivo Excel según el intervalo configurado. 
                    Asegúrate de que la ruta del archivo sea accesible y válida.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Logs del Scheduler */}
          {schedulerStatus?.logs && schedulerStatus.logs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-600">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-yellow-400" />
                <span>Logs Recientes</span>
              </h3>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {schedulerStatus.logs.map((log, index) => (
                  <div key={index} className={`p-3 rounded-lg text-sm ${
                    log.type === 'success' ? 'bg-green-900/20 border border-green-600' :
                    log.type === 'error' ? 'bg-red-900/20 border border-red-600' :
                    log.type === 'warning' ? 'bg-yellow-900/20 border border-yellow-600' :
                    'bg-slate-800 border border-slate-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        log.type === 'success' ? 'text-green-300' :
                        log.type === 'error' ? 'text-red-300' :
                        log.type === 'warning' ? 'text-yellow-300' :
                        'text-slate-300'
                      }`}>
                        {log.message}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(log.timestamp).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Información sobre el proceso */}
      <div className="card p-6 bg-blue-900/20 border-blue-600">
        <div className="flex items-start space-x-3">
          <Info className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-blue-300 mb-3">Información del Proceso de Carga</h3>
            <div className="space-y-2 text-sm text-blue-200">
              <p>• <strong>Validación:</strong> El sistema verifica que el archivo Excel tenga las columnas requeridas</p>
              <p>• <strong>Duplicados:</strong> Las referencias ya existentes en la base de datos se omiten automáticamente</p>
              <p>• <strong>Procesamiento:</strong> Se procesan todas las filas válidas y se registran los errores encontrados</p>
              <p>• <strong>Resultados:</strong> Se muestra un resumen detallado del proceso de carga</p>
              <p>• <strong>Columnas requeridas:</strong> Referencia, Fecha, CTA, NOMBRE, Taller, Pieza, Concepto, COSTO, PVP, Importe, Usuario, Descripcion siniestro</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resultados de la carga */}
      {uploadResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Resultados de la Carga</h3>
            <button
              onClick={clearResults}
              className="text-slate-400 hover:text-white text-sm"
            >
              Limpiar resultados
            </button>
          </div>
          <UploadResults result={uploadResult} />
        </div>
      )}

      {/* Estadísticas rápidas */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Estadísticas Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700 p-4 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Total Presupuestos</p>
            <p className="text-2xl font-bold text-white">
              {uploadResult?.estadisticas?.totalFilas || 0}
            </p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Nuevos Agregados</p>
            <p className="text-2xl font-bold text-green-400">
              {uploadResult?.estadisticas?.presupuestosGuardados || 0}
            </p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Errores</p>
            <p className="text-2xl font-bold text-red-400">
              {uploadResult?.estadisticas?.errores || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CargaExcel;
