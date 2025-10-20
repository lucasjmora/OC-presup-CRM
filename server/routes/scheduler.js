const express = require('express');
const router = express.Router();
const schedulerService = require('../services/scheduler');

// Obtener estado del scheduler
router.get('/status', (req, res) => {
  try {
    const status = schedulerService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar scheduler
router.post('/start', (req, res) => {
  try {
    schedulerService.start();
    res.json({ 
      message: 'Scheduler iniciado correctamente',
      status: schedulerService.getStatus()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detener scheduler
router.post('/stop', (req, res) => {
  try {
    schedulerService.stop();
    res.json({ 
      message: 'Scheduler detenido correctamente',
      status: schedulerService.getStatus()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar configuración del scheduler
router.put('/config', (req, res) => {
  try {
    const { interval, enabled, excelPath, excelSheet } = req.body;
    
    // Validar intervalo cron
    if (interval && !isValidCronExpression(interval)) {
      return res.status(400).json({ 
        error: 'Formato de intervalo cron inválido' 
      });
    }

    const newConfig = {
      interval: interval || schedulerService.config.interval,
      enabled: enabled !== undefined ? enabled : schedulerService.config.enabled,
      excelPath: excelPath || schedulerService.config.excelPath,
      excelSheet: excelSheet || schedulerService.config.excelSheet
    };

    schedulerService.updateConfig(newConfig);
    
    res.json({ 
      message: 'Configuración del scheduler actualizada',
      config: schedulerService.config,
      status: schedulerService.getStatus()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ejecutar carga manualmente
router.post('/execute', (req, res) => {
  try {
    schedulerService.executeAutoLoad();
    res.json({ 
      message: 'Carga automática ejecutada manualmente',
      status: schedulerService.getStatus()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener logs del scheduler
router.get('/logs', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = schedulerService.logs.slice(0, parseInt(limit));
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Función para validar expresión cron
function isValidCronExpression(cronExpression) {
  try {
    const cronParser = require('cron-parser');
    new cronParser.default(cronExpression);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = router;

