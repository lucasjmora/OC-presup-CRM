import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Database, 
  FileSpreadsheet, 
  Save, 
  TestTube, 
  CheckCircle, 
  AlertTriangle,
  Loader,
  Settings as SettingsIcon
} from 'lucide-react';
import { configuracionAPI, formatError } from '../services/api';

const Configuracion = () => {
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState({});

  // Estados para el formulario
  const [formData, setFormData] = useState({
    uri: '',
    database: '',
    collection: '',
    excelPath: '',
    excelSheet: '',
  });

  // Consulta para obtener configuración actual
  const { data: configuracion, isLoading } = useQuery(
    'configuracion',
    () => configuracionAPI.getConfiguracion().then(res => res.data),
    {
      staleTime: 0, // Los datos se consideran obsoletos inmediatamente
      cacheTime: 0, // No mantener en cache
    }
  );

  // Efecto para sincronizar el estado local con los datos de la query
  useEffect(() => {
    if (configuracion) {
      setFormData(configuracion);
    }
  }, [configuracion]);

  // Mutación para actualizar configuración
  const updateConfigMutation = useMutation(
    (data) => configuracionAPI.updateConfiguracion(data),
    {
      onSuccess: (response) => {
        // Actualizar el cache con los nuevos datos
        queryClient.setQueryData('configuracion', response.data.configuracion);
        // Invalidar y refrescar la query
        queryClient.invalidateQueries('configuracion');
        // Actualizar el estado local con los nuevos datos
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
          connection: { success: true, message: data.message }
        }));
      },
      onError: (error) => {
        setTestResults(prev => ({
          ...prev,
          connection: { success: false, message: formatError(error) }
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
          excel: { success: true, message: data.message, data }
        }));
      },
      onError: (error) => {
        setTestResults(prev => ({
          ...prev,
          excel: { success: false, message: formatError(error) }
        }));
      },
    }
  );

  // Función para manejar cambios en el formulario
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Función para guardar configuración
  const handleSave = () => {
    updateConfigMutation.mutate(formData);
  };

  // Función para probar conexión MongoDB
  const handleTestConnection = () => {
    testConnectionMutation.mutate({
      uri: formData.uri,
      database: formData.database,
    });
  };

  // Función para probar archivo Excel
  const handleTestExcel = () => {
    testExcelMutation.mutate({
      excelPath: formData.excelPath,
      excelSheet: formData.excelSheet,
    });
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
          <h1 className="text-3xl font-bold text-white">Configuración</h1>
          <p className="text-slate-400 mt-1">
            Configuración de base de datos y archivo Excel
          </p>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <SettingsIcon className="w-6 h-6" />
        </div>
      </div>

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
                onChange={(e) => handleInputChange('uri', e.target.value)}
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
                onChange={(e) => handleInputChange('database', e.target.value)}
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
                onChange={(e) => handleInputChange('collection', e.target.value)}
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
                onChange={(e) => handleInputChange('excelPath', e.target.value)}
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
                onChange={(e) => handleInputChange('excelSheet', e.target.value)}
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

      {/* Botón de guardar */}
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
    </div>
  );
};

export default Configuracion;
