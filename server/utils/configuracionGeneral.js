const fs = require('fs').promises;
const path = require('path');

// Función para obtener la configuración general
async function obtenerConfiguracionGeneral() {
  try {
    const configPath = path.join(__dirname, '../config/general.json');
    
    // Intentar leer la configuración existente
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      // Si no existe el archivo, devolver valores por defecto
      return {
        diasParaPendiente: 2, // 2 días por defecto (48 horas)
        directorioAdjuntos: 'server/uploads/adjuntos' // Directorio por defecto para archivos adjuntos
      };
    }
  } catch (error) {
    console.error('Error al obtener configuración general:', error);
    // Devolver valores por defecto en caso de error
    return {
      diasParaPendiente: 2,
      directorioAdjuntos: 'server/uploads/adjuntos'
    };
  }
}

module.exports = {
  obtenerConfiguracionGeneral
};



























