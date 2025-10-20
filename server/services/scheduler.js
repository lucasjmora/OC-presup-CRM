const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const Presupuesto = require('../models/Presupuesto');
const Taller = require('../models/Taller');
const xlsx = require('xlsx');
const config = require('../config/database');

class SchedulerService {
  constructor() {
    this.isRunning = false;
    this.currentTask = null;
    this.config = {
      interval: '0 */30 * * * *', // Cada 30 minutos por defecto
      enabled: true
    };
    this.logs = [];
  }

  // Cargar configuración desde archivo
  loadConfig() {
    try {
      const configPath = path.join(__dirname, '../config/scheduler.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        this.config = { ...this.config, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.error('Error al cargar configuración del scheduler:', error);
    }
  }

  // Guardar configuración en archivo
  saveConfig() {
    try {
      const configDir = path.join(__dirname, '../config');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const configPath = path.join(configDir, 'scheduler.json');
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error al guardar configuración del scheduler:', error);
    }
  }

  // Agregar log de ejecución
  addLog(message, type = 'info', data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      type, // 'info', 'success', 'error', 'warning'
      data
    };
    
    this.logs.unshift(logEntry);
    
    // Mantener solo los últimos 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(0, 100);
    }
    
    console.log(`[SCHEDULER ${type.toUpperCase()}] ${message}`);
  }

  // Función principal de carga automática
  async executeAutoLoad() {
    if (!this.config.enabled) {
      this.addLog('Scheduler deshabilitado', 'warning');
      return;
    }

    this.addLog('Iniciando carga automática de Excel', 'info');
    
    try {
      // Obtener configuración del archivo Excel desde la configuración general
      const generalConfig = config.loadConfig();
      const excelPath = generalConfig.excelPath;
      
      if (!excelPath) {
        this.addLog('Ruta de Excel no configurada en configuración general', 'error');
        return;
      }

      // Verificar que el archivo existe
      if (!fs.existsSync(excelPath)) {
        this.addLog(`Archivo Excel no encontrado: ${excelPath}`, 'error');
        return;
      }

      // Leer archivo Excel
      const workbook = xlsx.readFile(excelPath);
      
      // Usar la hoja configurada o la primera hoja disponible
      let sheetName = generalConfig.excelSheet;
      if (!sheetName || sheetName.trim() === '') {
        // Si no hay hoja configurada, usar la primera hoja disponible
        sheetName = workbook.SheetNames[0];
        this.addLog(`Usando primera hoja disponible: '${sheetName}'`, 'info');
      }
      
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        this.addLog(`Hoja '${sheetName}' no encontrada en el archivo Excel. Hojas disponibles: ${workbook.SheetNames.join(', ')}`, 'error');
        return;
      }

      // Convertir a JSON
      const jsonData = xlsx.utils.sheet_to_json(worksheet);
      
      if (!jsonData || jsonData.length === 0) {
        this.addLog('No se encontraron datos en el archivo Excel', 'warning');
        return;
      }

      this.addLog(`Procesando ${jsonData.length} filas del archivo Excel`, 'info');

      // Obtener talleres únicos para mapeo
      const talleres = await Taller.find({});
      const tallerMap = {};
      talleres.forEach(taller => {
        tallerMap[taller.codigo] = taller.nombre;
      });

      let nuevosPresupuestos = 0;
      let referenciasExistentes = 0;
      let errores = 0;
      const referenciasExistentesList = [];

      // Procesar cada fila
      for (const row of jsonData) {
        try {
          // Validar campos requeridos
          if (!row.Referencia || !row.Fecha || !row.Taller) {
            errores++;
            this.addLog(`Fila ${row.Referencia || 'sin referencia'}: Campos requeridos faltantes`, 'warning');
            continue;
          }

          // Verificar si ya existe
          const existe = await Presupuesto.findOne({ referencia: row.Referencia });
          if (existe) {
            referenciasExistentes++;
            referenciasExistentesList.push(row.Referencia);
            continue;
          }

          // Crear nuevo presupuesto
          const presupuestoData = {
            referencia: row.Referencia,
            fecha: new Date(row.Fecha),
            cta: row.CTA || '',
            nombre: row.NOMBRE || '',
            taller: row.Taller,
            nombreTaller: tallerMap[row.Taller] || row.Taller,
            pieza: row.Pieza || '',
            concepto: row.Concepto || '',
            costo: parseFloat(row.COSTO) || 0,
            pvp: parseFloat(row.PVP) || 0,
            importe: parseFloat(row.Importe) || 0,
            usuario: row.Usuario || 'Sistema Automático',
            descripcionSiniestro: row['Descripcion siniestro'] || row['Descripción siniestro'] || 'Sin descripción',
            estado: 'Abierto', // Cambiar de 'Pendiente' a 'Abierto' que es válido
            auditoria: {
              creadoPor: 'Sistema Automático',
              fechaCreacion: new Date(),
              modificadoPor: 'Sistema Automático',
              fechaModificacion: new Date()
            }
          };

          await Presupuesto.create(presupuestoData);
          nuevosPresupuestos++;

        } catch (error) {
          errores++;
          this.addLog(`Error procesando fila ${row.Referencia}: ${error.message}`, 'error');
          // Log adicional para debugging
          if (error.name === 'ValidationError') {
            this.addLog(`Detalles validación para ${row.Referencia}: ${JSON.stringify(error.errors)}`, 'error');
          }
        }
      }

      // Log del resultado
      this.addLog(`Carga automática completada: ${nuevosPresupuestos} nuevos, ${referenciasExistentes} existentes, ${errores} errores`, 'success', {
        nuevosPresupuestos,
        referenciasExistentes,
        errores,
        totalFilas: jsonData.length
      });

      // Si se cargaron nuevos presupuestos, notificar para invalidar cache
      if (nuevosPresupuestos > 0) {
        this.addLog(`Notificando actualización de datos: ${nuevosPresupuestos} presupuestos nuevos cargados`, 'info');
      }

    } catch (error) {
      this.addLog(`Error en carga automática: ${error.message}`, 'error', { error: error.message });
    }
  }

  // Iniciar scheduler
  start() {
    if (this.isRunning) {
      this.addLog('Scheduler ya está ejecutándose', 'warning');
      return;
    }

    this.loadConfig();
    
    if (!this.config.enabled) {
      this.addLog('Scheduler deshabilitado en configuración', 'warning');
      return;
    }

    try {
      this.currentTask = cron.schedule(this.config.interval, () => {
        this.executeAutoLoad();
      }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
      });

      this.isRunning = true;
      this.addLog(`Scheduler iniciado con intervalo: ${this.config.interval}`, 'success');
      
    } catch (error) {
      this.addLog(`Error al iniciar scheduler: ${error.message}`, 'error');
    }
  }

  // Detener scheduler
  stop() {
    if (!this.isRunning) {
      this.addLog('Scheduler no está ejecutándose', 'warning');
      return;
    }

    if (this.currentTask) {
      this.currentTask.destroy();
      this.currentTask = null;
    }

    this.isRunning = false;
    this.addLog('Scheduler detenido', 'info');
  }

  // Actualizar configuración
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.addLog('Configuración del scheduler actualizada', 'info');
    
    // Reiniciar si está ejecutándose
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  // Obtener estado actual
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      logs: this.logs.slice(0, 20), // Solo últimos 20 logs
      nextExecution: this.isRunning ? this.getNextExecution() : null
    };
  }

  // Calcular próxima ejecución
  getNextExecution() {
    if (!this.isRunning || !this.currentTask) return null;
    
    try {
      // Parsear la expresión cron para obtener los minutos
      const cronParts = this.config.interval.split(' ');
      if (cronParts.length < 2) return null;
      
      const minutesPart = cronParts[1];
      let minutesInterval = 30; // Default
      
      if (minutesPart.includes('*/')) {
        minutesInterval = parseInt(minutesPart.split('*/')[1]);
      } else if (minutesPart === '*') {
        minutesInterval = 1; // Cada minuto
      }
      
      // Calcular la próxima ejecución basada en el intervalo de minutos
      const now = new Date();
      const nextExecution = new Date(now);
      
      // Redondear al siguiente intervalo de minutos
      const currentMinutes = now.getMinutes();
      const nextMinutes = Math.ceil((currentMinutes + 1) / minutesInterval) * minutesInterval;
      
      if (nextMinutes >= 60) {
        nextExecution.setHours(nextExecution.getHours() + 1);
        nextExecution.setMinutes(nextMinutes - 60);
      } else {
        nextExecution.setMinutes(nextMinutes);
      }
      
      nextExecution.setSeconds(0);
      nextExecution.setMilliseconds(0);
      
      return nextExecution;
    } catch (error) {
      this.addLog(`Error calculando próxima ejecución: ${error.message}`, 'warning');
      return null;
    }
  }
}

// Instancia singleton
const schedulerService = new SchedulerService();

module.exports = schedulerService;
