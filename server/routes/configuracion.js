const express = require('express');
const router = express.Router();
const config = require('../config/database');

// GET - Obtener configuración actual
router.get('/', (req, res) => {
  try {
    const configuracion = {
      uri: config.uri,
      database: config.database,
      collection: config.collection,
      excelPath: config.excelPath,
      excelSheet: config.excelSheet
    };
    
    res.json(configuracion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - Actualizar configuración
router.put('/', (req, res) => {
  try {
    const {
      uri,
      database,
      collection,
      excelPath,
      excelSheet
    } = req.body;

    // Validaciones básicas
    if (!uri || !database || !collection) {
      return res.status(400).json({ 
        error: 'Los campos URI, Database y Collection son obligatorios' 
      });
    }

    const nuevaConfig = {
      uri: uri.trim(),
      database: database.trim(),
      collection: collection.trim(),
      excelPath: excelPath ? excelPath.trim() : '',
      excelSheet: excelSheet ? excelSheet.trim() : ''
    };

    const guardado = config.saveConfig(nuevaConfig);
    
    if (!guardado) {
      return res.status(500).json({ error: 'Error al guardar la configuración' });
    }

    res.json({ 
      message: 'Configuración actualizada correctamente',
      configuracion: nuevaConfig
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Probar conexión a MongoDB
router.post('/test-connection', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { uri, database } = req.body;

    if (!uri || !database) {
      return res.status(400).json({ 
        error: 'URI y Database son requeridos para probar la conexión' 
      });
    }

    const connectionString = `${uri}/${database}`;
    
    // Intentar conectar
    const connection = await mongoose.createConnection(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });

    // Verificar conexión
    await connection.asPromise();
    
    // Cerrar conexión de prueba
    await connection.close();

    res.json({ 
      success: true, 
      message: 'Conexión exitosa a MongoDB' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error de conexión: ' + error.message 
    });
  }
});

// POST - Probar archivo Excel
router.post('/test-excel', async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const fs = require('fs');
    const { excelPath, excelSheet } = req.body;

    if (!excelPath) {
      return res.status(400).json({ 
        error: 'Ruta del archivo Excel es requerida' 
      });
    }

    // Verificar si el archivo existe
    if (!fs.existsSync(excelPath)) {
      return res.status(400).json({ 
        error: 'El archivo Excel no existe en la ruta especificada' 
      });
    }

    // Leer el archivo Excel
    const workbook = XLSX.readFile(excelPath);
    
    // Obtener nombres de hojas
    const sheetNames = workbook.SheetNames;
    
    if (sheetNames.length === 0) {
      return res.status(400).json({ 
        error: 'El archivo Excel no contiene hojas' 
      });
    }

    // Si se especifica una hoja, verificar que existe
    let sheetName = excelSheet || sheetNames[0];
    if (!sheetNames.includes(sheetName)) {
      return res.status(400).json({ 
        error: `La hoja "${sheetName}" no existe. Hojas disponibles: ${sheetNames.join(', ')}` 
      });
    }

    // Leer la hoja
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length === 0) {
      return res.status(400).json({ 
        error: 'La hoja está vacía' 
      });
    }

    // Verificar estructura básica (al menos debe tener encabezados)
    const headers = data[0];
    const requiredColumns = ['Referencia', 'Fecha', 'CTA', 'NOMBRE', 'Taller', 'Pieza', 'Concepto', 'COSTO', 'PVP', 'Importe', 'Usuario', 'Descripcion siniestro'];
    
    const missingColumns = requiredColumns.filter(col => 
      !headers.some(header => 
        header && header.toString().toLowerCase().includes(col.toLowerCase())
      )
    );

    if (missingColumns.length > 0) {
      return res.status(400).json({ 
        error: `Columnas requeridas faltantes: ${missingColumns.join(', ')}`,
        headers: headers,
        totalRows: data.length - 1
      });
    }

    res.json({ 
      success: true, 
      message: 'Archivo Excel válido',
      sheetNames: sheetNames,
      currentSheet: sheetName,
      totalRows: data.length - 1,
      headers: headers
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error al leer el archivo Excel: ' + error.message 
    });
  }
});

module.exports = router;
