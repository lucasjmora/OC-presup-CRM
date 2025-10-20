const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Ruta para obtener la configuración general
router.get('/', async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../config/general.json');
    
    // Intentar leer la configuración existente
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      res.json({ 
        success: true, 
        configuracion: config 
      });
    } catch (error) {
      // Si no existe el archivo, crear uno con valores por defecto
      const defaultConfig = {
        diasParaPendiente: 2, // 2 días por defecto (48 horas)
        directorioAdjuntos: 'server/uploads/adjuntos' // Directorio por defecto para archivos adjuntos
      };
      
      // Crear el directorio si no existe
      const configDir = path.dirname(configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      // Guardar la configuración por defecto
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      
      res.json({ 
        success: true, 
        configuracion: defaultConfig 
      });
    }
  } catch (error) {
    console.error('Error al obtener configuración general:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Ruta para actualizar la configuración general
router.put('/', async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../config/general.json');
    
    // Leer configuración existente
    let configExistente = {
      diasParaPendiente: 2,
      directorioAdjuntos: 'server/uploads/adjuntos'
    };
    
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      configExistente = JSON.parse(configData);
    } catch (error) {
      // Si no existe, usar valores por defecto
    }
    
    // Actualizar solo los campos que vienen en el body
    const configActualizada = {
      ...configExistente,
      ...req.body
    };
    
    // Validar diasParaPendiente si viene en el body
    if (req.body.diasParaPendiente !== undefined) {
      const diasParaPendiente = parseInt(req.body.diasParaPendiente);
      if (isNaN(diasParaPendiente) || diasParaPendiente < 1 || diasParaPendiente > 30) {
        return res.status(400).json({
          success: false,
          error: 'El período debe estar entre 1 y 30 días'
        });
      }
      configActualizada.diasParaPendiente = diasParaPendiente;
    }
    
    // Validar directorioAdjuntos si viene en el body
    if (req.body.directorioAdjuntos !== undefined) {
      if (!req.body.directorioAdjuntos || req.body.directorioAdjuntos.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'El directorio de adjuntos no puede estar vacío'
        });
      }
      configActualizada.directorioAdjuntos = req.body.directorioAdjuntos.trim();
    }
    
    // Crear el directorio si no existe
    const configDir = path.dirname(configPath);
    await fs.mkdir(configDir, { recursive: true });
    
    // Guardar la configuración
    await fs.writeFile(configPath, JSON.stringify(configActualizada, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Configuración actualizada correctamente',
      configuracion: configActualizada 
    });
  } catch (error) {
    console.error('Error al actualizar configuración general:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

module.exports = router;



























