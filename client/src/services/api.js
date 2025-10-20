import axios from 'axios';

// Función para detectar la URL base automáticamente
const getBaseURL = () => {
  // Si hay una variable de entorno definida, usarla
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Obtener el hostname actual
  const hostname = window.location.hostname;
  
  // Si estamos en localhost, usar localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  
  // Si estamos accediendo desde una IP de red, usar esa IP
  return `http://${hostname}:5000`;
};

// Crear instancia de axios con baseURL dinámico
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Asegurar que siempre use la baseURL correcta
    config.baseURL = getBaseURL();
    
    // Agregar timestamp para evitar cache
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Manejar errores de red
    if (error.code === 'ECONNABORTED') {
      console.error('Timeout de la petición');
      return Promise.reject(new Error('La petición tardó demasiado tiempo'));
    }

    // Manejar errores de servidor
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          console.error('Error de validación:', data.error);
          break;
        case 401:
          console.error('No autorizado');
          break;
        case 403:
          console.error('Acceso denegado');
          break;
        case 404:
          console.error('Recurso no encontrado');
          break;
        case 500:
          console.error('Error interno del servidor:', data.error);
          break;
        default:
          console.error(`Error ${status}:`, data.error);
      }
    } else if (error.request) {
      console.error('Error de red - No se pudo conectar al servidor');
    } else {
      console.error('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Funciones helper para formatear errores
export const formatError = (error) => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'Error desconocido';
};

// Funciones específicas para presupuestos
export const presupuestosAPI = {
  // Obtener presupuestos con filtros
  getPresupuestos: (params = {}) => api.get('/api/presupuestos', { params }),
  
  // Obtener presupuesto por referencia
  getPresupuesto: (referencia) => api.get(`/api/presupuestos/${referencia}`),
  
  // Obtener estadísticas
  getEstadisticas: () => api.get('/api/presupuestos/stats/estadisticas'),
  
  // Obtener por tipo de siniestro
  getPorTipoSiniestro: () => api.get('/api/presupuestos/stats/por-tipo-siniestro'),
  
  // Obtener talleres únicos
  getTalleres: () => api.get('/api/presupuestos/stats/talleres'),
  
  // Obtener tipos de siniestro únicos
  getTiposSiniestro: () => api.get('/api/presupuestos/stats/tipos-siniestro'),
  
  // Obtener estadísticas de presupuestos abiertos pendientes por taller
  getAbiertosPendientesPorTaller: (params) => api.get('/api/presupuestos/stats/abiertos-pendientes-por-taller', { params }),
  
  // Obtener estadísticas de presupuestos aceptados por taller
  getAceptadosPorTaller: (params) => api.get('/api/presupuestos/stats/aceptados-por-taller', { params }),
  
  // Obtener estadísticas de presupuestos rechazados por taller
  getRechazadosPorTaller: (params) => api.get('/api/presupuestos/stats/rechazados-por-taller', { params }),
  
  // Obtener estadísticas de conversión por taller
  getConversionPorTaller: (params) => api.get('/api/presupuestos/stats/conversion-por-taller', { params }),
  
  // Obtener estadísticas por estado
  getEstadisticasPorEstado: () => api.get('/api/presupuestos/stats/por-estado'),
  
  // Eliminar presupuesto
  deletePresupuesto: (referencia) => api.delete(`/api/presupuestos/${referencia}`),
  
  // Actualizar presupuesto
  updatePresupuesto: (referencia, data) => api.put(`/api/presupuestos/${referencia}`, data),
  
  // Cambiar estado con auditoría
  cambiarEstado: (referencia, data) => api.put(`/api/presupuestos/${referencia}/estado`, data),
  
  // Agregar comentario
  agregarComentario: (referencia, comentario) => api.post(`/api/presupuestos/${referencia}/comentarios`, comentario),
  
  // Eliminar comentario
  eliminarComentario: (referencia, comentarioId) => api.delete(`/api/presupuestos/${referencia}/comentarios/${comentarioId}`),
  
  // Actualizar Ref. OR taller
  actualizarOrSiniestro: (referencia, data) => api.put(`/api/presupuestos/${referencia}/or-siniestro`, data),
  
  // Subir archivo adjunto
  subirAdjunto: (referencia, formData, config) => {
    return axios.post(`${getBaseURL()}/api/presupuestos/${referencia}/adjuntos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config
    });
  },
  
  // Descargar archivo adjunto
  descargarAdjunto: (referencia, nombreArchivo) => {
    return axios.get(`${getBaseURL()}/api/presupuestos/${referencia}/adjuntos/${nombreArchivo}`, {
      responseType: 'blob'
    });
  },
  
  // Eliminar archivo adjunto
  eliminarAdjunto: (referencia, nombreArchivo) => api.delete(`/api/presupuestos/${referencia}/adjuntos/${nombreArchivo}`),
};

// Funciones específicas para configuración general
export const configuracionGeneralAPI = {
  // Obtener configuración general
  getConfiguracionGeneral: () => api.get('/api/configuracion/general'),
  
  // Actualizar configuración general
  updateConfiguracionGeneral: (data) => api.put('/api/configuracion/general', data),
};

// Funciones específicas para scheduler automático
export const schedulerAPI = {
  // Obtener estado del scheduler
  getStatus: () => api.get('/api/scheduler/status'),
  
  // Iniciar scheduler
  start: () => api.post('/api/scheduler/start'),
  
  // Detener scheduler
  stop: () => api.post('/api/scheduler/stop'),
  
  // Actualizar configuración
  updateConfig: (data) => api.put('/api/scheduler/config', data),
  
  // Ejecutar carga manualmente
  execute: () => api.post('/api/scheduler/execute'),
  
  // Obtener logs
  getLogs: (limit = 50) => api.get(`/api/scheduler/logs?limit=${limit}`),
};

// Funciones específicas para configuración
export const configuracionAPI = {
  // Obtener configuración
  getConfiguracion: () => api.get('/api/configuracion'),
  
  // Actualizar configuración
  updateConfiguracion: (data) => api.put('/api/configuracion', data),
  
  // Probar conexión MongoDB
  testConnection: (data) => api.post('/api/configuracion/test-connection', data),
  
  // Probar archivo Excel
  testExcel: (data) => api.post('/api/configuracion/test-excel', data),
};

// Funciones específicas para carga de archivos
export const uploadAPI = {
  // Cargar archivo Excel
  uploadExcel: (data) => api.post('/api/upload/excel', data),
  
  // Cargar desde configuración
  uploadFromConfig: () => api.post('/api/upload/from-config'),
};

// Funciones específicas para talleres
export const talleresAPI = {
  // Obtener todos los talleres
  getTalleres: () => api.get('/api/talleres'),
  
  // Obtener talleres activos
  getTalleresActivos: () => api.get('/api/talleres/activos'),
  
  // Obtener un taller por código
  getTaller: (codigo) => api.get(`/api/talleres/${codigo}`),
  
  // Crear un nuevo taller
  crearTaller: (data) => api.post('/api/talleres', data),
  
  // Actualizar un taller
  actualizarTaller: (codigo, data) => api.put(`/api/talleres/${codigo}`, data),
  
  // Eliminar un taller
  eliminarTaller: (codigo) => api.delete(`/api/talleres/${codigo}`),
  
  // Obtener códigos únicos de talleres desde presupuestos
  getCodigosUnicos: () => api.get('/api/talleres/stats/codigos-unicos'),
};

// Funciones específicas para aceites
export const aceitesAPI = {
  // Obtener todos los aceites
  getAceites: () => api.get('/api/aceites'),
  
  // Obtener un aceite por ID
  getAceite: (id) => api.get(`/api/aceites/${id}`),
  
  // Crear un nuevo aceite
  createAceite: (data) => api.post('/api/aceites', data),
  
  // Actualizar un aceite
  updateAceite: (id, data) => api.put(`/api/aceites/${id}`, data),
  
  // Eliminar un aceite
  deleteAceite: (id) => api.delete(`/api/aceites/${id}`),
  
  // Buscar aceite por SKU
  searchBySku: (sku) => api.get(`/api/aceites/search/${sku}`),
};

export default api;
