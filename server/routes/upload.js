const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const fs = require('fs');
const Presupuesto = require('../models/Presupuesto');
const config = require('../config/database');

// Función para procesar fechas de Excel correctamente
function parseExcelDate(excelDate) {
  if (typeof excelDate === 'number') {
    // Fecha como número de Excel (días desde 1900-01-01)
    const utcDays = Math.floor(excelDate - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    return dateInfo;
  } else if (excelDate instanceof Date) {
    return excelDate;
  } else if (typeof excelDate === 'string') {
    return new Date(excelDate);
  } else {
    return new Date();
  }
}

// Función helper para procesar archivo Excel
const processExcelFile = async (excelPath, excelSheet) => {
  try {
    console.log(`📁 Procesando archivo: ${excelPath}`);
    console.log(`📋 Hoja: ${excelSheet || 'Primera hoja'}`);

    // Verificar si el archivo existe
    if (!fs.existsSync(excelPath)) {
      throw new Error('El archivo Excel no existe en la ruta especificada');
    }

    // Leer el archivo Excel
    const workbook = XLSX.readFile(excelPath);
    const sheetNames = workbook.SheetNames;
    
    // Determinar qué hoja usar
    let targetSheet = excelSheet || sheetNames[0];
    if (!sheetNames.includes(targetSheet)) {
      throw new Error(`La hoja "${targetSheet}" no existe. Hojas disponibles: ${sheetNames.join(', ')}`);
    }

    const worksheet = workbook.Sheets[targetSheet];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rawData.length < 2) {
      throw new Error('El archivo no contiene datos suficientes');
    }

    // Obtener encabezados y datos
    const headers = rawData[0];
    const dataRows = rawData.slice(1);

    console.log(`📊 Total de filas a procesar: ${dataRows.length}`);

    // Mapear índices de columnas
    const columnMap = {
      referencia: headers.findIndex(h => h && h.toString().toLowerCase().includes('referencia')),
      fecha: headers.findIndex(h => h && h.toString().toLowerCase().includes('fecha')),
      cta: headers.findIndex(h => h && h.toString().toLowerCase().includes('cta')),
      nombre: headers.findIndex(h => h && h.toString().toLowerCase().includes('nombre')),
      taller: headers.findIndex(h => h && h.toString().toLowerCase().includes('taller')),
      pieza: headers.findIndex(h => h && h.toString().toLowerCase().includes('pieza')),
      concepto: headers.findIndex(h => h && h.toString().toLowerCase().includes('concepto')),
      cantidad: headers.findIndex(h => h && h.toString().toLowerCase().includes('cant')),
      costo: headers.findIndex(h => h && h.toString().toLowerCase().includes('costo')),
      pvp: headers.findIndex(h => h && h.toString().toLowerCase().includes('pvp')),
      importe: headers.findIndex(h => h && h.toString().toLowerCase().includes('importe')),
      usuario: headers.findIndex(h => h && h.toString().toLowerCase().includes('usuario')),
      descripcionSiniestro: headers.findIndex(h => h && h.toString().toLowerCase().includes('descripcion siniestro'))
    };

    // Verificar que todas las columnas requeridas estén presentes
    const missingColumns = Object.entries(columnMap)
      .filter(([key, index]) => index === -1)
      .map(([key]) => key);

    if (missingColumns.length > 0) {
      throw new Error(`Columnas faltantes: ${missingColumns.join(', ')}`);
    }

    // Procesar datos - MANEJO CORRECTO DE MÚLTIPLES PIEZAS
    const presupuestosMap = new Map();
    const referenciasExistentes = new Set();
    const referenciasNuevas = new Set();
    const errores = [];
    let currentReferencia = null;
    let currentPresupuesto = null;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      try {
        // Verificar si hay una nueva referencia en esta fila
        const nuevaReferencia = row[columnMap.referencia] ? row[columnMap.referencia].toString().trim() : null;
        
        if (nuevaReferencia && nuevaReferencia !== '') {
          // Nueva referencia encontrada
          currentReferencia = nuevaReferencia;
          
          // Verificar que tenga los datos básicos
          if (!row[columnMap.nombre]) {
            errores.push({
              fila: i + 2,
              error: `Referencia ${currentReferencia} sin nombre`,
              datos: row
            });
            continue;
          }

          // Verificar si la referencia ya existe
          const presupuestoExistente = await Presupuesto.findOne({ referencia: currentReferencia });
          if (presupuestoExistente) {
            referenciasExistentes.add(currentReferencia);
            
            // Obtener la fecha del Excel si está disponible
            let fechaExcel = null;
            if (columnMap.fecha !== -1 && row[columnMap.fecha]) {
              try {
                fechaExcel = parseExcelDate(row[columnMap.fecha]);
                console.log(`📅 Fecha del Excel para ${currentReferencia}: ${fechaExcel}`);
              } catch (error) {
                console.log(`⚠️ Error al parsear fecha del Excel para ${currentReferencia}: ${error.message}`);
              }
            }
            
            // Usar el presupuesto existente como base para actualización
            currentPresupuesto = {
              _id: presupuestoExistente._id,
              referencia: currentReferencia,
              cta: row[columnMap.cta] ? row[columnMap.cta].toString().trim() : presupuestoExistente.cta,
              nombre: row[columnMap.nombre] ? row[columnMap.nombre].toString().trim() : presupuestoExistente.nombre,
              taller: row[columnMap.taller] ? row[columnMap.taller].toString().trim() : presupuestoExistente.taller,
              usuario: row[columnMap.usuario] ? row[columnMap.usuario].toString().trim() : presupuestoExistente.usuario,
              descripcionSiniestro: row[columnMap.descripcionSiniestro] ? row[columnMap.descripcionSiniestro].toString().trim() : (presupuestoExistente.descripcionSiniestro || 'Sin descripción'),
              orSiniestro: presupuestoExistente.orSiniestro,
              estado: presupuestoExistente.estado, // Preservar estado
              comentarios: presupuestoExistente.comentarios, // Preservar comentarios
              piezas: [], // Se llenará con las nuevas piezas del Excel
              fechaCarga: fechaExcel || presupuestoExistente.fechaCarga, // Usar fecha del Excel si está disponible
              ultimaActualizacion: new Date(), // Actualizar fecha de última actualización
              auditoria: {
                ...presupuestoExistente.auditoria, // Preservar auditoría existente
                fechaCreacion: fechaExcel || presupuestoExistente.auditoria?.fechaCreacion, // Corregir fecha de creación con la del Excel
                modificadoPor: row[columnMap.usuario] ? row[columnMap.usuario].toString().trim() : presupuestoExistente.usuario,
                fechaModificacion: new Date()
              }
            };
          } else {
            // Crear nuevo presupuesto
            const usuarioCarga = row[columnMap.usuario] ? row[columnMap.usuario].toString().trim() : 'Sistema';
            
            // Obtener la fecha del Excel si está disponible
            let fechaExcel = new Date(); // Por defecto usar fecha actual
            if (columnMap.fecha !== -1 && row[columnMap.fecha]) {
              try {
                fechaExcel = parseExcelDate(row[columnMap.fecha]);
                console.log(`📅 Nueva referencia ${currentReferencia} con fecha del Excel: ${fechaExcel}`);
              } catch (error) {
                console.log(`⚠️ Error al parsear fecha del Excel para nueva referencia ${currentReferencia}: ${error.message}`);
              }
            }
            
            currentPresupuesto = {
              referencia: currentReferencia,
              cta: row[columnMap.cta] ? row[columnMap.cta].toString().trim() : '',
              nombre: row[columnMap.nombre].toString().trim(),
              taller: row[columnMap.taller] ? row[columnMap.taller].toString().trim() : '',
              usuario: usuarioCarga,
              descripcionSiniestro: row[columnMap.descripcionSiniestro] ? row[columnMap.descripcionSiniestro].toString().trim() : 'Sin descripción',
              piezas: [],
              fechaCarga: fechaExcel, // Usar fecha del Excel
              auditoria: {
                creadoPor: usuarioCarga,
                fechaCreacion: fechaExcel, // Usar fecha del Excel
                modificadoPor: null,
                fechaModificacion: null,
                estadoCambiadoPor: null,
                fechaCambioEstado: null,
                estadoAnterior: null
              }
            };
          }

          presupuestosMap.set(currentReferencia, currentPresupuesto);
          if (!presupuestoExistente) {
            referenciasNuevas.add(currentReferencia);
          }
        }

        // Si tenemos un presupuesto actual y hay datos de pieza
        if (currentPresupuesto && row[columnMap.pieza]) {
          const pieza = row[columnMap.pieza].toString().trim();
          const concepto = row[columnMap.concepto] ? row[columnMap.concepto].toString().trim() : '';
          const cantidad = parseFloat(row[columnMap.cantidad]) || 1;
          const costo = parseFloat(row[columnMap.costo]) || 0;
          const pvp = parseFloat(row[columnMap.pvp]) || 0;
          const importe = parseFloat(row[columnMap.importe]) || 0;

          if (pieza !== '') {
            currentPresupuesto.piezas.push({
              pieza: pieza,
              concepto: concepto,
              cantidad: cantidad,
              costo: costo,
              pvp: pvp,
              importe: importe
            });
          }
        }

      } catch (error) {
        errores.push({
          fila: i + 2,
          error: error.message,
          datos: row
        });
      }
    }

    console.log(`✅ Referencias nuevas encontradas: ${referenciasNuevas.size}`);
    console.log(`⚠️ Referencias existentes (omitidas): ${referenciasExistentes.size}`);
    console.log(`❌ Errores: ${errores.length}`);

    // Guardar/actualizar presupuestos en la base de datos
    let guardados = 0;
    let actualizados = 0;
    const presupuestosToProcess = Array.from(presupuestosMap.values()).filter(p => p.piezas.length > 0);
    
    if (presupuestosToProcess.length > 0) {
      try {
        for (const presupuesto of presupuestosToProcess) {
          if (presupuesto._id) {
            // Presupuesto existente - actualizar
            const { _id, ...updateData } = presupuesto;
            await Presupuesto.findByIdAndUpdate(_id, updateData, { new: true });
            actualizados++;
          } else {
            // Presupuesto nuevo - insertar
            const { _id, ...insertData } = presupuesto;
            await Presupuesto.create(insertData);
            guardados++;
          }
        }
        console.log(`💾 Presupuestos nuevos: ${guardados}`);
        console.log(`🔄 Presupuestos actualizados: ${actualizados}`);
      } catch (error) {
        console.error('Error al guardar/actualizar presupuestos:', error);
        throw new Error(`Error al guardar/actualizar presupuestos en la base de datos: ${error.message}`);
      }
    }

    return {
      message: 'Procesamiento completado',
      estadisticas: {
        totalFilas: dataRows.length,
        referenciasNuevas: referenciasNuevas.size,
        referenciasExistentes: referenciasExistentes.size,
        presupuestosNuevos: guardados,
        presupuestosActualizados: actualizados,
        errores: errores.length
      },
      errores: errores.slice(0, 10),
      referenciasExistentes: Array.from(referenciasExistentes).slice(0, 10)
    };

  } catch (error) {
    console.error('Error en procesamiento:', error);
    throw error;
  }
};

// POST - Cargar archivo Excel
router.post('/excel', async (req, res) => {
  try {
    const { excelPath, excelSheet } = req.body;
    
    // Usar configuración guardada si no se proporciona
    const config = require('../config/database');
    const path = excelPath || config.excelPath;
    const sheet = excelSheet || config.excelSheet;
    
    if (!path) {
      return res.status(400).json({ 
        error: 'Ruta del archivo Excel no especificada' 
      });
    }

    const result = await processExcelFile(path, sheet);
    res.json({ success: true, ...result });

  } catch (error) {
    console.error('Error en procesamiento:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al procesar el archivo Excel',
      message: error.message 
    });
  }
});

// POST - Cargar desde archivo configurado
router.post('/from-config', async (req, res) => {
  try {
    const config = require('../config/database');

    if (!config.excelPath) {
      return res.status(400).json({ 
        success: false,
        error: 'No hay archivo Excel configurado. Configure la ruta en Configuración.' 
      });
    }

    const excelPath = config.excelPath;
    const excelSheet = config.excelSheet;

    if (!fs.existsSync(excelPath)) {
      return res.status(400).json({ 
        success: false,
        error: 'El archivo Excel configurado no existe en la ruta especificada.' 
      });
    }

    console.log(`📁 Procesando archivo desde configuración: ${excelPath}`);
    console.log(`📋 Hoja: ${excelSheet || 'Primera hoja'}`);

    const result = await processExcelFile(excelPath, excelSheet);
    res.json({ success: true, ...result });

  } catch (error) {
    console.error('❌ Error al cargar Excel desde configuración:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor al procesar el archivo Excel desde configuración.', 
      details: error.message 
    });
  }
});

module.exports = router;
