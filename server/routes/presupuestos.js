const express = require('express');
const router = express.Router();
const Presupuesto = require('../models/Presupuesto');
const { obtenerConfiguracionGeneral } = require('../utils/configuracionGeneral');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// GET - Obtener todos los presupuestos con paginación y filtros
router.get('/', async (req, res) => {
  try {
    
    const {
      page = 1,
      limit = 50,
      search,
      fechaDesde,
      fechaHasta,
      tipoSiniestro,
      taller,
      estado,
      subestado,
      sortBy = 'fecha',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    // Construir filtros
    const filtros = {};
    
    if (search) {
      filtros.$or = [
        { referencia: { $regex: search, $options: 'i' } },
        { nombre: { $regex: search, $options: 'i' } },
        { concepto: { $regex: search, $options: 'i' } }
      ];
    }

    // Para filtros de fecha, usaremos agregación en lugar de filtros simples
    let fechaDesdeFilter = null;
    let fechaHastaFilter = null;
    
    if (fechaDesde) {
      fechaDesdeFilter = new Date(fechaDesde);
      console.log(`🔍 Filtro fechaDesde: ${fechaDesde} -> ${fechaDesdeFilter.toISOString()}`);
    }
    
    if (fechaHasta) {
      fechaHastaFilter = new Date(fechaHasta);
      console.log(`🔍 Filtro fechaHasta: ${fechaHasta} -> ${fechaHastaFilter.toISOString()}`);
    }

    if (tipoSiniestro) {
      filtros.descripcionSiniestro = { $regex: tipoSiniestro, $options: 'i' };
    }

    if (taller) {
      // Si el taller contiene comas, significa que son múltiples códigos para el mismo nombre
      if (taller.includes(',')) {
        const codigos = taller.split(',').map(c => c.trim());
        filtros.taller = { $in: codigos };
      } else {
        filtros.taller = taller;
      }
    }

    if (estado) {
      filtros.estado = estado;
    }

    let presupuestos;
    
    // Crear pipeline base para agregación
    const basePipeline = [
      { $match: filtros },
      {
        $addFields: {
          fechaOrdenamiento: {
            $ifNull: ["$auditoria.fechaCreacion", "$fechaCarga"]
          }
        }
      }
    ];

    // Agregar filtros de fecha si existen
    if (fechaDesdeFilter || fechaHastaFilter) {
      const fechaFilter = {};
      if (fechaDesdeFilter) {
        // Establecer inicio del día
        const fechaDesde = new Date(fechaDesdeFilter);
        fechaDesde.setHours(0, 0, 0, 0);
        fechaFilter.$gte = fechaDesde;
        console.log(`📅 Filtro desde: ${fechaDesde.toISOString()}`);
      }
      if (fechaHastaFilter) {
        // Establecer fin del día
        const fechaHasta = new Date(fechaHastaFilter);
        fechaHasta.setHours(23, 59, 59, 999);
        fechaFilter.$lte = fechaHasta;
        console.log(`📅 Filtro hasta: ${fechaHasta.toISOString()}`);
      }
      basePipeline.push({ $match: { fechaOrdenamiento: fechaFilter } });
      console.log(`🔍 Aplicando filtro de fecha:`, fechaFilter);
    }

    // Si el ordenamiento es por margen, usar agregación para calcular el margen
    if (sortBy === 'margen') {
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      
      const margenPipeline = [...basePipeline, {
        $addFields: {
          margenCalculado: {
            $cond: {
              if: { $eq: ["$importe", 0] },
              then: 0,
              else: { $multiply: [{ $divide: [{ $subtract: ["$importe", "$costo"] }, "$importe"] }, 100] }
            }
          }
        }
      }, { $sort: { margenCalculado: sortDirection } }, { $skip: skip }, { $limit: parseInt(limit) }];
      
      presupuestos = await Presupuesto.aggregate(margenPipeline);
    } else {
      // Para otros campos, usar ordenamiento normal
      const sort = {};
      
      // Si el ordenamiento es por fecha, usar la fecha de creación
      if (sortBy === 'fecha') {
        // Usar el pipeline base con ordenamiento por fecha
        const fechaPipeline = [...basePipeline, 
          { $sort: { fechaOrdenamiento: sortOrder === 'desc' ? -1 : 1 } },
          { $skip: skip },
          { $limit: parseInt(limit) }
        ];
        
        presupuestos = await Presupuesto.aggregate(fechaPipeline);
      } else {
        // Para otros campos, usar ordenamiento normal
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        presupuestos = await Presupuesto.find(filtros)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean();
      }
    }

    // Aplicar cálculos de aceites a todos los presupuestos
    if (presupuestos && presupuestos.length > 0) {
      try {
        presupuestos = await Presupuesto.procesarConAceites(presupuestos);
        
        // Actualizar campos principales con valores calculados si están disponibles
        presupuestos = presupuestos.map(doc => {
          let costoReal = doc.costo || 0;
          let pvpReal = doc.pvp || 0;
          let importeReal = doc.importe || 0;
          
          if (doc.piezas && doc.piezas.length > 0) {
            // Calcular valores reales basados en la suma de las piezas
            costoReal = doc.piezas.reduce((sum, pieza) => {
              return sum + (pieza.costoCalculado !== undefined ? pieza.costoCalculado : pieza.costo || 0);
            }, 0);
            
            pvpReal = doc.piezas.reduce((sum, pieza) => {
              return sum + (pieza.pvpCalculado !== undefined ? pieza.pvpCalculado : pieza.pvp || 0);
            }, 0);
            
            importeReal = doc.piezas.reduce((sum, pieza) => {
              return sum + (pieza.importe || 0);
            }, 0);
          }
          
          // Crear nuevo objeto con valores actualizados
          const updatedDoc = {
            ...doc,
            // Usar valores calculados si están disponibles, sino usar suma de piezas
            costo: doc.costoCalculado !== undefined ? doc.costoCalculado : costoReal,
            pvp: doc.pvpCalculado !== undefined ? doc.pvpCalculado : pvpReal,
            importe: importeReal // Usar suma de importes de todas las piezas
          };
          
          // Recalcular margen con los valores actualizados
          const importe = updatedDoc.importe || 0;
          const costo = updatedDoc.costo || 0;
          updatedDoc.margen = importe > 0 ? Math.round(((importe - costo) / importe) * 100) : 0;
          
          return updatedDoc;
        });
      } catch (error) {
        console.error('Error al procesar aceites en listado:', error);
        // Continuar sin cálculos de aceites si hay error
      }
    }

    // Si se usó agregación, limpiar campos calculados
    if (sortBy === 'margen') {
      presupuestos = presupuestos.map(doc => {
        // No sobrescribir el margen si ya fue recalculado con valores de aceites
        const result = { ...doc };
        
        if (doc.margenCalculado && doc.costoCalculado === undefined) {
          // Solo usar margenCalculado si no hay valores calculados de aceites
          result.margen = doc.margenCalculado;
        }
        
        return result;
      });
    } else if (sortBy === 'fecha') {
      // Remover el campo temporal de ordenamiento por fecha
      presupuestos = presupuestos.map(doc => {
        const { fechaOrdenamiento, ...resto } = doc;
        return resto;
      });
    }

    // Obtener configuración general para calcular subestados
    const configuracion = await obtenerConfiguracionGeneral();
    const diasParaPendiente = configuracion.diasParaPendiente || 2;

    // Agregar subestado a cada presupuesto usando la configuración
    presupuestos = presupuestos.map(presupuesto => {
      const presupuestoObj = presupuesto.toObject ? presupuesto.toObject() : presupuesto;
      
      // Calcular subestado usando la lógica corregida
      if (presupuestoObj.estado === 'Abierto') {
        // Obtener la fecha de creación del presupuesto
        const fechaCreacion = presupuestoObj.auditoria?.fechaCreacion || presupuestoObj.fechaCarga;
        
        // Si no hay comentarios, calcular desde la fecha de creación
        if (!presupuestoObj.comentarios || presupuestoObj.comentarios.length === 0) {
          const ahora = new Date();
          const diferenciaHoras = (ahora - new Date(fechaCreacion)) / (1000 * 60 * 60);
          const horasParaPendiente = diasParaPendiente * 24;
          
          // Si han pasado más horas que las configuradas desde la creación, es pendiente
          if (diferenciaHoras > horasParaPendiente) {
            presupuestoObj.subestado = 'Pendiente';
          } else {
            presupuestoObj.subestado = 'En espera';
          }
        } else {
          // Si hay comentarios, obtener el comentario más reciente
          const comentarioMasReciente = presupuestoObj.comentarios.reduce((masReciente, comentario) => {
            return new Date(comentario.fecha) > new Date(masReciente.fecha) ? comentario : masReciente;
          });

          // Usar la fecha más reciente entre la creación y el último comentario
          const fechaReferencia = new Date(comentarioMasReciente.fecha) > new Date(fechaCreacion) 
            ? new Date(comentarioMasReciente.fecha) 
            : new Date(fechaCreacion);

          // Calcular la diferencia en horas desde la fecha de referencia
          const ahora = new Date();
          const diferenciaHoras = (ahora - fechaReferencia) / (1000 * 60 * 60);
          const horasParaPendiente = diasParaPendiente * 24;

          // Si han pasado más horas que las configuradas, es pendiente
          if (diferenciaHoras > horasParaPendiente) {
            presupuestoObj.subestado = 'Pendiente';
          } else {
            presupuestoObj.subestado = 'En espera';
          }
        }
      } else {
        presupuestoObj.subestado = null;
      }
      
      return presupuestoObj;
    });

    // Calcular el total usando la misma lógica de filtrado
    let total;
    if (fechaDesdeFilter || fechaHastaFilter || sortBy === 'fecha' || sortBy === 'margen') {
      // Usar agregación para contar con filtros de fecha
      const countPipeline = [...basePipeline, { $count: "total" }];
      const countResult = await Presupuesto.aggregate(countPipeline);
      total = countResult.length > 0 ? countResult[0].total : 0;
    } else {
      // Usar conteo simple para otros casos
      total = await Presupuesto.countDocuments(filtros);
    }

    // Si hay filtro por subestado, necesitamos reaplicar la lógica
    if (subestado) {
      // Obtener TODOS los registros que coinciden con los filtros base (sin paginación)
      let todosLosPresupuestos;
      
      if (sortBy === 'margen') {
        const margenPipelineCompleto = [...basePipeline, {
          $addFields: {
            margenCalculado: {
              $cond: {
                if: { $eq: ["$importe", 0] },
                then: 0,
                else: { $multiply: [{ $divide: [{ $subtract: ["$importe", "$costo"] }, "$importe"] }, 100] }
              }
            }
          }
        }, { $sort: { margenCalculado: sortOrder === 'desc' ? -1 : 1 } }];
        
        todosLosPresupuestos = await Presupuesto.aggregate(margenPipelineCompleto);
      } else if (sortBy === 'fecha') {
        const fechaPipelineCompleto = [...basePipeline, 
          { $sort: { fechaOrdenamiento: sortOrder === 'desc' ? -1 : 1 } }
        ];
        
        todosLosPresupuestos = await Presupuesto.aggregate(fechaPipelineCompleto);
      } else {
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        todosLosPresupuestos = await Presupuesto.find(filtros)
          .sort(sort)
          .lean();
      }

      // Limpiar campos calculados si se usó agregación
      if (sortBy === 'margen') {
        todosLosPresupuestos = todosLosPresupuestos.map(doc => {
          const { margenCalculado, ...resto } = doc;
          return resto;
        });
      }

      // Obtener configuración y agregar subestados a TODOS los registros
      const configuracion = await obtenerConfiguracionGeneral();
      const diasParaPendiente = configuracion.diasParaPendiente || 2;

      todosLosPresupuestos = todosLosPresupuestos.map(presupuesto => {
        const presupuestoObj = presupuesto.toObject ? presupuesto.toObject() : presupuesto;
        
        if (presupuestoObj.estado === 'Abierto') {
          const fechaCreacion = presupuestoObj.auditoria?.fechaCreacion || presupuestoObj.fechaCarga;
          
          if (!presupuestoObj.comentarios || presupuestoObj.comentarios.length === 0) {
            const ahora = new Date();
            const diferenciaHoras = (ahora - new Date(fechaCreacion)) / (1000 * 60 * 60);
            const horasParaPendiente = diasParaPendiente * 24;
            
            if (diferenciaHoras > horasParaPendiente) {
              presupuestoObj.subestado = 'Pendiente';
            } else {
              presupuestoObj.subestado = 'En espera';
            }
          } else {
            const comentarioMasReciente = presupuestoObj.comentarios.reduce((masReciente, comentario) => {
              return new Date(comentario.fecha) > new Date(masReciente.fecha) ? comentario : masReciente;
            });

            const fechaReferencia = new Date(comentarioMasReciente.fecha) > new Date(fechaCreacion) 
              ? new Date(comentarioMasReciente.fecha) 
              : new Date(fechaCreacion);

            const ahora = new Date();
            const diferenciaHoras = (ahora - fechaReferencia) / (1000 * 60 * 60);
            const horasParaPendiente = diasParaPendiente * 24;

            if (diferenciaHoras > horasParaPendiente) {
              presupuestoObj.subestado = 'Pendiente';
            } else {
              presupuestoObj.subestado = 'En espera';
            }
          }
        } else {
          presupuestoObj.subestado = null;
        }

        return presupuestoObj;
      });

      // Filtrar por subestado
      const presupuestosFiltrados = todosLosPresupuestos.filter(presupuesto => presupuesto.subestado === subestado);
      
      // Recalcular total y paginación
      const totalFiltrado = presupuestosFiltrados.length;
      const skip = (page - 1) * limit;
      presupuestos = presupuestosFiltrados.slice(skip, skip + parseInt(limit));
      
      // Actualizar total para la paginación
      total = totalFiltrado;
    }

    res.json({
      presupuestos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener un presupuesto por referencia
router.get('/:referencia', async (req, res) => {
  try {
    const presupuesto = await Presupuesto.aggregate([
      { $match: { referencia: req.params.referencia } },
      {
        $lookup: {
          from: "talleres",
          localField: "taller",
          foreignField: "codigo",
          as: "tallerInfo"
        }
      },
      {
        $addFields: {
          nombreTaller: {
            $ifNull: [
              { $arrayElemAt: ["$tallerInfo.nombre", 0] },
              "$taller"
            ]
          }
        }
      },
      { $limit: 1 }
    ]);
    
    if (!presupuesto || presupuesto.length === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    const presupuestoData = presupuesto[0];
    
    // Obtener configuración general para calcular subestados
    const configuracion = await obtenerConfiguracionGeneral();
    const diasParaPendiente = configuracion.diasParaPendiente || 2;

    // Calcular subestado usando la lógica corregida
    if (presupuestoData.estado === 'Abierto') {
      // Obtener la fecha de creación del presupuesto
      const fechaCreacion = presupuestoData.auditoria?.fechaCreacion || presupuestoData.fechaCarga;
      
      // Si no hay comentarios, calcular desde la fecha de creación
      if (!presupuestoData.comentarios || presupuestoData.comentarios.length === 0) {
        const ahora = new Date();
        const diferenciaHoras = (ahora - new Date(fechaCreacion)) / (1000 * 60 * 60);
        const horasParaPendiente = diasParaPendiente * 24;
        
        // Si han pasado más horas que las configuradas desde la creación, es pendiente
        if (diferenciaHoras > horasParaPendiente) {
          presupuestoData.subestado = 'Pendiente';
        } else {
          presupuestoData.subestado = 'En espera';
        }
      } else {
        // Si hay comentarios, obtener el comentario más reciente
        const comentarioMasReciente = presupuestoData.comentarios.reduce((masReciente, comentario) => {
          return new Date(comentario.fecha) > new Date(masReciente.fecha) ? comentario : masReciente;
        });

        // Usar la fecha más reciente entre la creación y el último comentario
        const fechaReferencia = new Date(comentarioMasReciente.fecha) > new Date(fechaCreacion) 
          ? new Date(comentarioMasReciente.fecha) 
          : new Date(fechaCreacion);

        // Calcular la diferencia en horas desde la fecha de referencia
        const ahora = new Date();
        const diferenciaHoras = (ahora - fechaReferencia) / (1000 * 60 * 60);
        const horasParaPendiente = diasParaPendiente * 24;

        // Si han pasado más horas que las configuradas, es pendiente
        if (diferenciaHoras > horasParaPendiente) {
          presupuestoData.subestado = 'Pendiente';
        } else {
          presupuestoData.subestado = 'En espera';
        }
      }
    } else {
      presupuestoData.subestado = null;
    }

    // Aplicar cálculo de aceites si hay piezas
    if (presupuestoData.piezas && presupuestoData.piezas.length > 0) {
      try {
        // Crear una instancia temporal del modelo para usar los métodos
        const presupuestoInstance = new Presupuesto(presupuestoData);
        
        // Procesar cada pieza para calcular aceites
        const piezasProcesadas = [];
        for (const pieza of presupuestoData.piezas) {
          const calculoAceite = await presupuestoInstance.calcularCostoPvpAceite(pieza);
          
          piezasProcesadas.push({
            ...pieza,
            costoCalculado: calculoAceite.costo,
            pvpCalculado: calculoAceite.pvp,
            esAceite: calculoAceite.esAceite,
            infoAceite: calculoAceite.infoAceite,
            calculosAceite: calculoAceite.calculos
          });
        }
        
        presupuestoData.piezas = piezasProcesadas;
        
        // Recalcular totales usando los valores calculados
        presupuestoData.costoCalculado = piezasProcesadas.reduce((sum, p) => sum + (p.costoCalculado || 0), 0);
        presupuestoData.pvpCalculado = piezasProcesadas.reduce((sum, p) => sum + (p.pvpCalculado || 0), 0);
        presupuestoData.importeCalculado = presupuestoData.pvpCalculado;
        
      } catch (error) {
        console.error('Error al procesar aceites en presupuesto individual:', error);
        // Si hay error, usar valores originales
        presupuestoData.costoCalculado = presupuestoData.costo;
        presupuestoData.pvpCalculado = presupuestoData.pvp;
        presupuestoData.importeCalculado = presupuestoData.importe;
      }
    }

    res.json(presupuestoData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener estadísticas
router.get('/stats/estadisticas', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    // Si hay filtros de fecha, usar agregación
    if (fechaDesde || fechaHasta) {
      const pipeline = [];
      
      // Filtro por fecha usando auditoria.fechaCreacion o fechaCarga
      if (fechaDesde || fechaHasta) {
        const fechaFilter = {};
        if (fechaDesde) {
          const fechaDesdeDate = new Date(fechaDesde);
          fechaDesdeDate.setHours(0, 0, 0, 0);
          fechaFilter.$gte = fechaDesdeDate;
        }
        if (fechaHasta) {
          const fechaHastaDate = new Date(fechaHasta);
          fechaHastaDate.setHours(23, 59, 59, 999);
          fechaFilter.$lte = fechaHastaDate;
        }
        
        pipeline.push({
          $match: {
            $or: [
              { 'auditoria.fechaCreacion': fechaFilter },
              { fechaCarga: fechaFilter }
            ]
          }
        });
      }
      
      pipeline.push(
        {
          $group: {
            _id: null,
            totalPresupuestos: { $addToSet: "$referencia" },
            totalImporte: { $sum: "$importe" },
            totalCosto: { $sum: "$costo" },
            totalPvp: { $sum: "$pvp" }
          }
        },
        {
          $project: {
            _id: 0,
            totalPresupuestos: { $size: "$totalPresupuestos" },
            totalImporte: 1,
            totalCosto: 1,
            totalPvp: 1,
            margen: { 
              $cond: {
                if: { $eq: ["$totalImporte", 0] },
                then: 0,
                else: { $multiply: [{ $divide: [{ $subtract: ["$totalImporte", "$totalCosto"] }, "$totalImporte"] }, 100] }
              }
            }
          }
        }
      );
      
      const stats = await Presupuesto.aggregate(pipeline);
      const estadisticas = stats[0] || {
        totalPresupuestos: 0,
        totalImporte: 0,
        totalCosto: 0,
        totalPvp: 0,
        margen: 0
      };
      
      res.json(estadisticas);
    } else {
      // Sin filtros de fecha, usar el método normal
      const estadisticas = await Presupuesto.getEstadisticas({});
      res.json(estadisticas);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener presupuestos por tipo de siniestro
router.get('/stats/por-tipo-siniestro', async (req, res) => {
  try {
    const porTipo = await Presupuesto.getPorTipoSiniestro();
    res.json(porTipo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener estadísticas por taller
router.get('/stats/por-taller', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    // Si hay filtros de fecha, usar agregación
    if (fechaDesde || fechaHasta) {
      const pipeline = [];
      
      // Filtro por fecha usando auditoria.fechaCreacion o fechaCarga
      if (fechaDesde || fechaHasta) {
        const fechaFilter = {};
        if (fechaDesde) {
          const fechaDesdeDate = new Date(fechaDesde);
          fechaDesdeDate.setHours(0, 0, 0, 0);
          fechaFilter.$gte = fechaDesdeDate;
        }
        if (fechaHasta) {
          const fechaHastaDate = new Date(fechaHasta);
          fechaHastaDate.setHours(23, 59, 59, 999);
          fechaFilter.$lte = fechaHastaDate;
        }
        
        pipeline.push({
          $match: {
            $or: [
              { 'auditoria.fechaCreacion': fechaFilter },
              { fechaCarga: fechaFilter }
            ]
          }
        });
      }
      
      pipeline.push(
        {
          $group: {
            _id: "$taller",
            presupuestos: { $addToSet: "$referencia" },
            cantidad: { $sum: 1 },
            importe: { $sum: "$importe" },
            costo: { $sum: "$costo" },
            pvp: { $sum: "$pvp" }
          }
        },
        {
          $project: {
            _id: 0,
            taller: "$_id",
            cantidad: { $size: "$presupuestos" },
            importe: 1,
            costo: 1,
            pvp: 1,
            margen: { 
              $cond: {
                if: { $eq: ["$importe", 0] },
                then: 0,
                else: { $multiply: [{ $divide: [{ $subtract: ["$importe", "$costo"] }, "$importe"] }, 100] }
              }
            }
          }
        },
        { $sort: { cantidad: -1 } }
      );
      
      const estadisticas = await Presupuesto.aggregate(pipeline);
      res.json(estadisticas);
    } else {
      // Sin filtros de fecha, usar el método normal
      const estadisticas = await Presupuesto.getEstadisticasPorTaller({});
      res.json(estadisticas);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener estadísticas por estado
router.get('/stats/por-estado', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    // Si hay filtros de fecha, usar agregación
    if (fechaDesde || fechaHasta) {
      const pipeline = [];
      
      // Filtro por fecha usando auditoria.fechaCreacion o fechaCarga
      if (fechaDesde || fechaHasta) {
        const fechaFilter = {};
        if (fechaDesde) {
          const fechaDesdeDate = new Date(fechaDesde);
          fechaDesdeDate.setHours(0, 0, 0, 0);
          fechaFilter.$gte = fechaDesdeDate;
        }
        if (fechaHasta) {
          const fechaHastaDate = new Date(fechaHasta);
          fechaHastaDate.setHours(23, 59, 59, 999);
          fechaFilter.$lte = fechaHastaDate;
        }
        
        pipeline.push({
          $match: {
            $or: [
              { 'auditoria.fechaCreacion': fechaFilter },
              { fechaCarga: fechaFilter }
            ]
          }
        });
      }
      
      pipeline.push(
        {
          $group: {
            _id: "$estado",
            cantidad: { $sum: 1 },
            importe: { $sum: "$importe" },
            costo: { $sum: "$costo" },
            pvp: { $sum: "$pvp" }
          }
        },
        {
          $project: {
            _id: 0,
            estado: "$_id",
            cantidad: 1,
            importe: 1,
            costo: 1,
            pvp: 1,
            margen: { 
              $cond: {
                if: { $eq: ["$importe", 0] },
                then: 0,
                else: { $multiply: [{ $divide: [{ $subtract: ["$importe", "$costo"] }, "$importe"] }, 100] }
              }
            }
          }
        },
        { $sort: { cantidad: -1 } }
      );
      
      const estadisticas = await Presupuesto.aggregate(pipeline);
      res.json(estadisticas);
    } else {
      // Sin filtros de fecha, usar el método normal
      const estadisticas = await Presupuesto.getEstadisticasPorEstado({});
      res.json(estadisticas);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener talleres únicos
router.get('/stats/talleres', async (req, res) => {
  try {
    const talleres = await Presupuesto.distinct('taller');
    res.json(talleres.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener meses disponibles con registros
router.get('/stats/meses-disponibles', async (req, res) => {
  try {
    const meses = await Presupuesto.getMesesDisponibles();
    res.json(meses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener tipos de siniestro únicos
router.get('/stats/tipos-siniestro', async (req, res) => {
  try {
    const tipos = await Presupuesto.distinct('descripcionSiniestro');
    res.json(tipos.sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Eliminar un presupuesto por referencia
router.delete('/:referencia', async (req, res) => {
  try {
    const resultado = await Presupuesto.deleteMany({ referencia: req.params.referencia });
    
    if (resultado.deletedCount === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    res.json({ message: 'Presupuesto eliminado correctamente', deletedCount: resultado.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - Actualizar un presupuesto
router.put('/:referencia', async (req, res) => {
  try {
    const { referencia } = req.params;
    const { usuarioModificacion } = req.body;
    
    const datosActualizados = {
      ...req.body,
      ultimaActualizacion: new Date()
    };

    // Si se proporciona usuario de modificación, actualizar auditoría
    if (usuarioModificacion) {
      datosActualizados['auditoria.modificadoPor'] = usuarioModificacion;
      datosActualizados['auditoria.fechaModificacion'] = new Date();
    }

    const resultado = await Presupuesto.updateMany(
      { referencia },
      datosActualizados,
      { new: true }
    );

    if (resultado.modifiedCount === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    res.json({ message: 'Presupuesto actualizado correctamente', modifiedCount: resultado.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - Actualizar OR del Siniestro
router.put('/:referencia/or-siniestro', async (req, res) => {
  try {
    const { referencia } = req.params;
    const { orSiniestro, usuarioModificacion } = req.body;

    if (orSiniestro && orSiniestro.length > 15) {
      return res.status(400).json({ error: 'OR del Siniestro no puede exceder 15 caracteres' });
    }

    const datosActualizados = {
      orSiniestro: orSiniestro || '',
      ultimaActualizacion: new Date()
    };

    // Si se proporciona usuario de modificación, actualizar auditoría
    if (usuarioModificacion) {
      datosActualizados['auditoria.modificadoPor'] = usuarioModificacion;
      datosActualizados['auditoria.fechaModificacion'] = new Date();
    }

    const resultado = await Presupuesto.updateMany(
      { referencia },
      datosActualizados,
      { new: true }
    );

    if (resultado.modifiedCount === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    res.json({ 
      message: 'OR del Siniestro actualizado correctamente', 
      modifiedCount: resultado.modifiedCount,
      orSiniestro: orSiniestro || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - Cambiar estado de un presupuesto con auditoría
router.put('/:referencia/estado', async (req, res) => {
  try {
    const { referencia } = req.params;
    const { nuevoEstado, usuarioCambioEstado } = req.body;

    if (!nuevoEstado || !usuarioCambioEstado) {
      return res.status(400).json({ error: 'Nuevo estado y usuario son requeridos' });
    }

    if (!['Abierto', 'Rechazado', 'Aceptado'].includes(nuevoEstado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const presupuesto = await Presupuesto.findOne({ referencia });
    
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    const estadoAnterior = presupuesto.estado;
    
    // Actualizar estado y auditoría
    presupuesto.estado = nuevoEstado;
    presupuesto.ultimaActualizacion = new Date();
    
    // Inicializar auditoría si no existe
    if (!presupuesto.auditoria) {
      presupuesto.auditoria = {
        creadoPor: presupuesto.usuario || 'Sistema',
        fechaCreacion: presupuesto.fechaCarga, // ✅ Usar solo fechaCarga, sin fallback
        modificadoPor: null,
        fechaModificacion: null,
        estadoCambiadoPor: null,
        fechaCambioEstado: null,
        estadoAnterior: null
      };
    }
    
    presupuesto.auditoria.estadoCambiadoPor = usuarioCambioEstado;
    presupuesto.auditoria.fechaCambioEstado = new Date();
    presupuesto.auditoria.estadoAnterior = estadoAnterior;
    
    await presupuesto.save();

    res.json({ 
      message: 'Estado actualizado correctamente',
      estadoAnterior,
      nuevoEstado,
      usuarioCambioEstado
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Agregar comentario a un presupuesto
router.post('/:referencia/comentarios', async (req, res) => {
  try {
    const { referencia } = req.params;
    const { texto, usuario } = req.body;

    if (!texto || !usuario) {
      return res.status(400).json({ error: 'Texto y usuario son requeridos' });
    }

    const presupuesto = await Presupuesto.findOne({ referencia });
    
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    const nuevoComentario = {
      id: Date.now(),
      texto: texto.trim(),
      fecha: new Date(),
      usuario: usuario.trim()
    };

    presupuesto.comentarios.push(nuevoComentario);
    presupuesto.ultimaActualizacion = new Date();
    
    await presupuesto.save();

    res.json({
      message: 'Comentario agregado correctamente',
      comentario: nuevoComentario
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Eliminar comentario de un presupuesto
router.delete('/:referencia/comentarios/:comentarioId', async (req, res) => {
  try {
    const { referencia, comentarioId } = req.params;

    const presupuesto = await Presupuesto.findOne({ referencia });
    
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    const comentarioIndex = presupuesto.comentarios.findIndex(
      c => c.id === parseInt(comentarioId)
    );

    if (comentarioIndex === -1) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    presupuesto.comentarios.splice(comentarioIndex, 1);
    presupuesto.ultimaActualizacion = new Date();
    
    await presupuesto.save();

    res.json({ message: 'Comentario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener estadísticas de presupuestos rechazados por taller
router.get('/stats/rechazados-por-taller', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    // Construir filtros base para presupuestos rechazados
    const filtros = { estado: 'Rechazado' };
    
    // Agregar filtros de fecha si se proporcionan
    let fechaFilter = {};
    if (fechaDesde || fechaHasta) {
      if (fechaDesde) {
        const fechaDesdeDate = new Date(fechaDesde);
        fechaDesdeDate.setHours(0, 0, 0, 0);
        fechaFilter.$gte = fechaDesdeDate;
      }
      if (fechaHasta) {
        const fechaHastaDate = new Date(fechaHasta);
        fechaHastaDate.setHours(23, 59, 59, 999);
        fechaFilter.$lte = fechaHastaDate;
      }
    }

    // Obtener todos los presupuestos rechazados
    let presupuestos;
    if (Object.keys(fechaFilter).length > 0) {
      presupuestos = await Presupuesto.aggregate([
        { $match: filtros },
        {
          $addFields: {
            fechaOrdenamiento: {
              $ifNull: ["$auditoria.fechaCreacion", "$fechaCarga"]
            }
          }
        },
        { $match: { fechaOrdenamiento: fechaFilter } }
      ]);
    } else {
      presupuestos = await Presupuesto.find(filtros).lean();
    }

    // Obtener todos los talleres únicos de la base de datos
    const todosLosTalleres = await Presupuesto.distinct('taller');

    // Motivos de rechazo predefinidos
    const motivosRechazo = ['No responde', 'Precio elevado', 'Tiempo de demora'];

    // Agrupar por taller y contar (incluyendo talleres con 0)
    const estadisticasPorTaller = {};
    
    // Inicializar todos los talleres con 0
    todosLosTalleres.forEach(taller => {
      estadisticasPorTaller[taller] = {
        taller: taller,
        cantidad: 0,
        importe: 0,
        motivosRechazo: {
          'No responde': { cantidad: 0, porcentaje: 0 },
          'Precio elevado': { cantidad: 0, porcentaje: 0 },
          'Tiempo de demora': { cantidad: 0, porcentaje: 0 }
        }
      };
    });

    // Agrupar por referencia para evitar duplicados
    const presupuestosUnicos = new Map();
    
    presupuestos.forEach(presupuesto => {
      const key = presupuesto.referencia;
      if (!presupuestosUnicos.has(key)) {
        presupuestosUnicos.set(key, presupuesto);
      } else {
        // Si ya existe, mantener el primero (evitar duplicados)
        console.log(`⚠️  DUPLICADO DETECTADO: Presupuesto ${presupuesto.referencia} aparece múltiples veces`);
      }
    });
    
        // Procesar solo presupuestos únicos
    let contadorProcesados = 0;
    presupuestosUnicos.forEach((presupuesto, referencia) => {
      const taller = presupuesto.taller;
      if (estadisticasPorTaller[taller]) {
        contadorProcesados++;
        estadisticasPorTaller[taller].cantidad++;
        estadisticasPorTaller[taller].importe += presupuesto.importe || 0;


        // Analizar comentarios para encontrar motivos de rechazo (SOLO UNO POR PRESUPUESTO)
        if (presupuesto.comentarios && presupuesto.comentarios.length > 0) {
          // Concatenar todos los comentarios para análisis completo
          const todosLosComentarios = presupuesto.comentarios
            .map(c => c.texto)
            .join(' ')
            .toLowerCase();
          
          
          // NUEVA LÓGICA: Usar regex para detección más precisa
          let motivoAsignado = null;
          
          // Detectar motivos con regex más específicos
          if (/\bno\s+responde\b/i.test(todosLosComentarios)) {
            estadisticasPorTaller[taller].motivosRechazo['No responde'].cantidad++;
            motivoAsignado = 'No responde';
          } else if (/\bprecio\s+(elevado|alto|muy\s+caro)\b/i.test(todosLosComentarios)) {
            estadisticasPorTaller[taller].motivosRechazo['Precio elevado'].cantidad++;
            motivoAsignado = 'Precio elevado';
          } else if (/\btiempo\s+de\s+demora\b|\bdemora\b|\btardanza\b/i.test(todosLosComentarios)) {
            estadisticasPorTaller[taller].motivosRechazo['Tiempo de demora'].cantidad++;
            motivoAsignado = 'Tiempo de demora';
          }
          
        }
      }
    });


    // Calcular porcentajes de motivos de rechazo por taller
    Object.values(estadisticasPorTaller).forEach(taller => {
      if (taller.cantidad > 0) {
        // Debug: verificar que la suma de motivos no exceda la cantidad total
        const totalMotivos = Object.values(taller.motivosRechazo).reduce((sum, motivo) => sum + motivo.cantidad, 0);
        
        if (totalMotivos > taller.cantidad) {
          console.warn(`⚠️ Taller ${taller.taller}: Total motivos (${totalMotivos}) > cantidad total (${taller.cantidad})`);
          // Corregir proporcionalmente
          const factor = taller.cantidad / totalMotivos;
          Object.keys(taller.motivosRechazo).forEach(motivo => {
            taller.motivosRechazo[motivo].cantidad = Math.round(taller.motivosRechazo[motivo].cantidad * factor);
          });
        }
        
        // Calcular porcentajes
        Object.keys(taller.motivosRechazo).forEach(motivo => {
          taller.motivosRechazo[motivo].porcentaje = Math.round(
            (taller.motivosRechazo[motivo].cantidad / taller.cantidad) * 100
          );
        });
      }
    });

    // Convertir a array y ordenar por importe descendente
    const resultado = Object.values(estadisticasPorTaller)
      .sort((a, b) => (b.importe || 0) - (a.importe || 0));

    // Calcular totales generales
    const totales = {
      cantidad: resultado.reduce((sum, item) => sum + item.cantidad, 0),
      importe: resultado.reduce((sum, item) => sum + item.importe, 0)
    };

    res.json({
      talleres: resultado,
      totales: totales
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de rechazados por taller:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener estadísticas de conversión por taller (aceptados/total)
router.get('/stats/conversion-por-taller', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    // Construir filtros de fecha si se proporcionan
    let fechaFilter = {};
    if (fechaDesde || fechaHasta) {
      if (fechaDesde) {
        const fechaDesdeDate = new Date(fechaDesde);
        fechaDesdeDate.setHours(0, 0, 0, 0);
        fechaFilter.$gte = fechaDesdeDate;
      }
      if (fechaHasta) {
        const fechaHastaDate = new Date(fechaHasta);
        fechaHastaDate.setHours(23, 59, 59, 999);
        fechaFilter.$lte = fechaHastaDate;
      }
    }

    // Obtener todos los presupuestos (excluyendo "Abierto")
    let presupuestosQuery = { estado: { $ne: 'Abierto' } };
    let presupuestos;
    
    if (Object.keys(fechaFilter).length > 0) {
      presupuestos = await Presupuesto.aggregate([
        { $match: presupuestosQuery },
        {
          $addFields: {
            fechaOrdenamiento: {
              $ifNull: ["$auditoria.fechaCreacion", "$fechaCarga"]
            }
          }
        },
        { $match: { fechaOrdenamiento: fechaFilter } }
      ]);
    } else {
      presupuestos = await Presupuesto.find(presupuestosQuery).lean();
    }

    // Obtener todos los talleres únicos de la base de datos
    const todosLosTalleres = await Presupuesto.distinct('taller');

    // Agrupar por taller y calcular conversión
    const estadisticasPorTaller = {};
    
    // Inicializar todos los talleres con 0
    todosLosTalleres.forEach(taller => {
      estadisticasPorTaller[taller] = {
        taller: taller,
        total: 0,
        aceptados: 0,
        conversion: 0,
        importeTotal: 0,
        importeAceptados: 0
      };
    });

    // Contar presupuestos por estado
    presupuestos.forEach(presupuesto => {
      const taller = presupuesto.taller;
      if (estadisticasPorTaller[taller]) {
        estadisticasPorTaller[taller].total++;
        estadisticasPorTaller[taller].importeTotal += presupuesto.importe || 0;
        
        if (presupuesto.estado === 'Aceptado') {
          estadisticasPorTaller[taller].aceptados++;
          estadisticasPorTaller[taller].importeAceptados += presupuesto.importe || 0;
        }
      }
    });

    // Calcular porcentaje de conversión
    Object.values(estadisticasPorTaller).forEach(item => {
      if (item.total > 0) {
        item.conversion = Math.round((item.aceptados / item.total) * 100);
      }
    });

    // Convertir a array y ordenar por conversión descendente
    const resultado = Object.values(estadisticasPorTaller)
      .sort((a, b) => (b.conversion || 0) - (a.conversion || 0));

    // Calcular totales generales
    const totales = {
      total: resultado.reduce((sum, item) => sum + item.total, 0),
      aceptados: resultado.reduce((sum, item) => sum + item.aceptados, 0),
      conversion: 0,
      importeTotal: resultado.reduce((sum, item) => sum + item.importeTotal, 0),
      importeAceptados: resultado.reduce((sum, item) => sum + item.importeAceptados, 0)
    };

    if (totales.total > 0) {
      totales.conversion = Math.round((totales.aceptados / totales.total) * 100);
    }

    res.json({
      talleres: resultado,
      totales: totales
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de conversión por taller:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener estadísticas de presupuestos aceptados por taller
router.get('/stats/aceptados-por-taller', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    // Construir filtros base para presupuestos aceptados
    const filtros = { estado: 'Aceptado' };
    
    // Agregar filtros de fecha si se proporcionan
    let fechaFilter = {};
    if (fechaDesde || fechaHasta) {
      if (fechaDesde) {
        const fechaDesdeDate = new Date(fechaDesde);
        fechaDesdeDate.setHours(0, 0, 0, 0);
        fechaFilter.$gte = fechaDesdeDate;
      }
      if (fechaHasta) {
        const fechaHastaDate = new Date(fechaHasta);
        fechaHastaDate.setHours(23, 59, 59, 999);
        fechaFilter.$lte = fechaHastaDate;
      }
    }

    // Obtener todos los presupuestos aceptados
    let presupuestos;
    if (Object.keys(fechaFilter).length > 0) {
      presupuestos = await Presupuesto.aggregate([
        { $match: filtros },
        {
          $addFields: {
            fechaOrdenamiento: {
              $ifNull: ["$auditoria.fechaCreacion", "$fechaCarga"]
            }
          }
        },
        { $match: { fechaOrdenamiento: fechaFilter } }
      ]);
    } else {
      presupuestos = await Presupuesto.find(filtros).lean();
    }

    // Obtener todos los talleres únicos de la base de datos
    const todosLosTalleres = await Presupuesto.distinct('taller');

    // Agrupar por taller y contar (incluyendo talleres con 0)
    const estadisticasPorTaller = {};
    
    // Inicializar todos los talleres con 0
    todosLosTalleres.forEach(taller => {
      estadisticasPorTaller[taller] = {
        taller: taller,
        cantidad: 0,
        importe: 0
      };
    });

    // Contar los presupuestos aceptados
    presupuestos.forEach(presupuesto => {
      const taller = presupuesto.taller;
      if (estadisticasPorTaller[taller]) {
        estadisticasPorTaller[taller].cantidad++;
        estadisticasPorTaller[taller].importe += presupuesto.importe || 0;
      }
    });

    // Convertir a array y ordenar por importe descendente
    const resultado = Object.values(estadisticasPorTaller)
      .sort((a, b) => (b.importe || 0) - (a.importe || 0));

    // Calcular totales generales
    const totales = {
      cantidad: resultado.reduce((sum, item) => sum + item.cantidad, 0),
      importe: resultado.reduce((sum, item) => sum + item.importe, 0)
    };

    res.json({
      talleres: resultado,
      totales: totales
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de aceptados por taller:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener estadísticas de presupuestos abiertos pendientes por taller
router.get('/stats/abiertos-pendientes-por-taller', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    // Construir filtros base
    const filtros = { estado: 'Abierto' };
    
    // Agregar filtros de fecha si se proporcionan
    let fechaFilter = {};
    if (fechaDesde || fechaHasta) {
      if (fechaDesde) {
        const fechaDesdeDate = new Date(fechaDesde);
        fechaDesdeDate.setHours(0, 0, 0, 0);
        fechaFilter.$gte = fechaDesdeDate;
      }
      if (fechaHasta) {
        const fechaHastaDate = new Date(fechaHasta);
        fechaHastaDate.setHours(23, 59, 59, 999);
        fechaFilter.$lte = fechaHastaDate;
      }
    }

    // Obtener todos los presupuestos abiertos
    let presupuestos;
    if (Object.keys(fechaFilter).length > 0) {
      presupuestos = await Presupuesto.aggregate([
        { $match: filtros },
        {
          $addFields: {
            fechaOrdenamiento: {
              $ifNull: ["$auditoria.fechaCreacion", "$fechaCarga"]
            }
          }
        },
        { $match: { fechaOrdenamiento: fechaFilter } }
      ]);
    } else {
      presupuestos = await Presupuesto.find(filtros).lean();
    }

    // Obtener configuración para calcular subestados
    const { obtenerConfiguracionGeneral } = require('../utils/configuracionGeneral');
    const configuracion = await obtenerConfiguracionGeneral();
    const diasParaPendiente = configuracion.diasParaPendiente || 7;

    // Calcular subestados y filtrar solo los pendientes
    const presupuestosPendientes = presupuestos.filter(presupuesto => {
      const fechaCreacion = presupuesto.auditoria?.fechaCreacion || presupuesto.fechaCarga;
      
      if (!presupuesto.comentarios || presupuesto.comentarios.length === 0) {
        const ahora = new Date();
        const diferenciaHoras = (ahora - new Date(fechaCreacion)) / (1000 * 60 * 60);
        const horasParaPendiente = diasParaPendiente * 24;
        return diferenciaHoras > horasParaPendiente;
      } else {
        const comentarioMasReciente = presupuesto.comentarios.reduce((masReciente, comentario) => {
          return new Date(comentario.fecha) > new Date(masReciente.fecha) ? comentario : masReciente;
        });

        const fechaReferencia = new Date(comentarioMasReciente.fecha) > new Date(fechaCreacion) 
          ? new Date(comentarioMasReciente.fecha) 
          : new Date(fechaCreacion);

        const ahora = new Date();
        const diferenciaHoras = (ahora - fechaReferencia) / (1000 * 60 * 60);
        const horasParaPendiente = diasParaPendiente * 24;
        return diferenciaHoras > horasParaPendiente;
      }
    });

    // Obtener todos los talleres únicos de la base de datos
    const todosLosTalleres = await Presupuesto.distinct('taller');

    // Agrupar por taller y contar (incluyendo talleres con 0)
    const estadisticasPorTaller = {};
    
    // Inicializar todos los talleres con 0
    todosLosTalleres.forEach(taller => {
      estadisticasPorTaller[taller] = {
        taller: taller,
        cantidad: 0,
        importe: 0
      };
    });

    // Contar los presupuestos pendientes
    presupuestosPendientes.forEach(presupuesto => {
      const taller = presupuesto.taller;
      if (estadisticasPorTaller[taller]) {
        estadisticasPorTaller[taller].cantidad++;
        estadisticasPorTaller[taller].importe += presupuesto.importe || 0;
      }
    });

    // Convertir a array y ordenar por importe descendente
    const resultado = Object.values(estadisticasPorTaller)
      .sort((a, b) => (b.importe || 0) - (a.importe || 0));

    // Calcular totales generales
    const totales = {
      cantidad: resultado.reduce((sum, item) => sum + item.cantidad, 0),
      importe: resultado.reduce((sum, item) => sum + item.importe, 0)
    };

    res.json({
      talleres: resultado,
      totales: totales
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de abiertos pendientes por taller:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener estadísticas mensuales por taller (dinámico desde Agosto 2025)
router.get('/stats/mensuales-por-taller', async (req, res) => {
  try {
    const Taller = require('../models/Taller');
    
    // Calcular el rango de meses dinámicamente
    const fechaInicio = new Date(2025, 7, 1); // Agosto 2025
    const fechaActual = new Date();
    const mesActual = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    
    // Calcular la diferencia en meses
    const diffMeses = (mesActual.getFullYear() - fechaInicio.getFullYear()) * 12 + 
                      (mesActual.getMonth() - fechaInicio.getMonth());
    
    // Determinar el rango: si hay más de 6 meses, mostrar solo los últimos 6
    let fechaDesde;
    if (diffMeses > 6) {
      // Mostrar últimos 6 meses
      fechaDesde = new Date(mesActual.getFullYear(), mesActual.getMonth() - 5, 1);
    } else {
      // Mostrar desde agosto 2025
      fechaDesde = fechaInicio;
    }
    
    // Generar array de meses
    const meses = [];
    let fechaIteracion = new Date(fechaDesde);
    
    while (fechaIteracion <= mesActual) {
      const year = fechaIteracion.getFullYear();
      const month = fechaIteracion.getMonth();
      const ultimoDia = new Date(year, month + 1, 0).getDate();
      
      meses.push({
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        inicio: new Date(year, month, 1),
        fin: new Date(year, month, ultimoDia, 23, 59, 59, 999)
      });
      
      fechaIteracion = new Date(year, month + 1, 1);
    }

    // Obtener todos los talleres con sus nombres
    const talleres = await Taller.find({});
    const mapeoTalleres = {};
    talleres.forEach(taller => {
      mapeoTalleres[taller.codigo] = taller.nombre;
    });

    // Obtener todos los códigos de taller únicos en presupuestos
    const codigosTalleres = await Presupuesto.distinct('taller');

    // Inicializar estructura de datos por NOMBRE de taller
    const datosPorNombreTaller = {};
    const totalesPorMes = {};

    // Inicializar todos los nombres de taller únicos y meses con valores en 0
    const nombresUnicos = new Set();
    codigosTalleres.forEach(codigo => {
      const nombre = mapeoTalleres[codigo] || codigo;
      nombresUnicos.add(nombre);
    });

    nombresUnicos.forEach(nombreTaller => {
      datosPorNombreTaller[nombreTaller] = {
        taller: nombreTaller,
        meses: {}
      };
      
      meses.forEach(mes => {
        datosPorNombreTaller[nombreTaller].meses[mes.key] = {
          realizados: 0,
          aceptados: 0,
          conversion: 0,
          monto: 0
        };
      });
    });

    // Inicializar totales por mes
    meses.forEach(mes => {
      totalesPorMes[mes.key] = {
        realizados: 0,
        aceptados: 0,
        conversion: 0,
        monto: 0
      };
    });

    // Procesar cada mes
    for (const mes of meses) {
      // Obtener presupuestos del mes (excluyendo "Abierto" para realizados)
      const presupuestosMes = await Presupuesto.aggregate([
        {
          $addFields: {
            fechaOrdenamiento: {
              $ifNull: ["$auditoria.fechaCreacion", "$fechaCarga"]
            }
          }
        },
        {
          $match: {
            fechaOrdenamiento: {
              $gte: mes.inicio,
              $lte: mes.fin
            },
            estado: { $ne: 'Abierto' }
          }
        }
      ]);

      // Agrupar por NOMBRE de taller (aplicando mapeo)
      presupuestosMes.forEach(presupuesto => {
        const codigoTaller = presupuesto.taller;
        const nombreTaller = mapeoTalleres[codigoTaller] || codigoTaller;
        
        if (datosPorNombreTaller[nombreTaller]) {
          // Contar realizados (todos los que no son "Abierto")
          datosPorNombreTaller[nombreTaller].meses[mes.key].realizados++;
          
          // Contar aceptados y sumar monto
          if (presupuesto.estado === 'Aceptado') {
            datosPorNombreTaller[nombreTaller].meses[mes.key].aceptados++;
            datosPorNombreTaller[nombreTaller].meses[mes.key].monto += presupuesto.importe || 0;
          }
        }
      });

      // Calcular conversión para cada taller en este mes
      Object.keys(datosPorNombreTaller).forEach(nombreTaller => {
        const datos = datosPorNombreTaller[nombreTaller].meses[mes.key];
        if (datos.realizados > 0) {
          datos.conversion = Math.round((datos.aceptados / datos.realizados) * 100);
        }
      });

      // Calcular totales del mes
      Object.keys(datosPorNombreTaller).forEach(nombreTaller => {
        const datos = datosPorNombreTaller[nombreTaller].meses[mes.key];
        totalesPorMes[mes.key].realizados += datos.realizados;
        totalesPorMes[mes.key].aceptados += datos.aceptados;
        totalesPorMes[mes.key].monto += datos.monto;
      });

      // Calcular conversión total del mes
      if (totalesPorMes[mes.key].realizados > 0) {
        totalesPorMes[mes.key].conversion = Math.round(
          (totalesPorMes[mes.key].aceptados / totalesPorMes[mes.key].realizados) * 100
        );
      }
    }

    // Convertir a array y ordenar por nombre de taller alfabéticamente
    const resultado = Object.values(datosPorNombreTaller).sort((a, b) => 
      a.taller.localeCompare(b.taller, 'es', { sensitivity: 'base' })
    );

    res.json({
      talleres: resultado,
      totalesPorMes: totalesPorMes,
      mesesDisponibles: meses.map(m => m.key) // Incluir lista de meses para el frontend
    });
  } catch (error) {
    console.error('Error al obtener estadísticas mensuales por taller:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Endpoint de prueba para cálculo de aceites
router.get('/test/aceites/:referencia', async (req, res) => {
  try {
    const presupuesto = await Presupuesto.findOne({ referencia: req.params.referencia });
    
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    // Procesar con cálculo de aceites
    const presupuestosProcesados = await Presupuesto.procesarConAceites([presupuesto]);
    const presupuestoProcesado = presupuestosProcesados[0];

    res.json({
      referencia: presupuesto.referencia,
      piezas: presupuestoProcesado.piezas,
      totalesOriginales: {
        costo: presupuesto.costo,
        pvp: presupuesto.pvp,
        importe: presupuesto.importe
      },
      totalesCalculados: {
        costo: presupuestoProcesado.costoCalculado,
        pvp: presupuestoProcesado.pvpCalculado,
        importe: presupuestoProcesado.importeCalculado
      },
      diferencia: {
        costo: presupuestoProcesado.costoCalculado - presupuesto.costo,
        pvp: presupuestoProcesado.pvpCalculado - presupuesto.pvp,
        importe: presupuestoProcesado.importeCalculado - presupuesto.importe
      }
    });
  } catch (error) {
    console.error('Error en test de aceites:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener conteo de presupuestos aceptados con ORs
router.get('/stats/aceptados-con-ors', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    // Construir filtros base para presupuestos aceptados con ORs
    const filtros = { 
      estado: 'Aceptado',
      orSiniestro: {  
        $exists: true, 
        $nin: ['', null] // Usar $nin en lugar de múltiples $ne
      }
    };
    
    // Agregar filtros de fecha
    let fechaFilter = {};
    if (fechaDesde || fechaHasta) {
      if (fechaDesde) {
        const fechaDesdeDate = new Date(fechaDesde);
        fechaDesdeDate.setHours(0, 0, 0, 0);
        fechaFilter.$gte = fechaDesdeDate;
      }
      if (fechaHasta) {
        const fechaHastaDate = new Date(fechaHasta);
        fechaHastaDate.setHours(23, 59, 59, 999);
        fechaFilter.$lte = fechaHastaDate;
      }
    }

    // Obtener conteo de presupuestos aceptados con ORs
    let totalConORs;
    
    if (Object.keys(fechaFilter).length > 0) {
      // Si hay filtros de fecha, usar agregación
      let pipeline = [
        { $match: filtros },
        {
          $addFields: {
            fechaOrdenamiento: {
              $ifNull: ["$auditoria.fechaCreacion", "$fechaCarga"]
            }
          }
        },
        { $match: { fechaOrdenamiento: fechaFilter } },
        { $count: "total" }
      ];

      const resultado = await Presupuesto.aggregate(pipeline);
      totalConORs = resultado.length > 0 ? resultado[0].total : 0;
    } else {
      // Sin filtros de fecha, usar countDocuments
      totalConORs = await Presupuesto.countDocuments(filtros);
    }

    res.json({ totalConORs });
  } catch (error) {
    console.error('Error al obtener presupuestos aceptados con ORs:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener conteo de ORs por taller
router.get('/stats/ors-por-taller', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    
    // Construir filtros base para presupuestos aceptados con ORs
    const filtros = { 
      estado: 'Aceptado',
      orSiniestro: {  
        $exists: true, 
        $nin: ['', null]
      }
    };
    
    // Agregar filtros de fecha
    let fechaFilter = {};
    if (fechaDesde || fechaHasta) {
      if (fechaDesde) {
        const fechaDesdeDate = new Date(fechaDesde);
        fechaDesdeDate.setHours(0, 0, 0, 0);
        fechaFilter.$gte = fechaDesdeDate;
      }
      if (fechaHasta) {
        const fechaHastaDate = new Date(fechaHasta);
        fechaHastaDate.setHours(23, 59, 59, 999);
        fechaFilter.$lte = fechaHastaDate;
      }
    }

    // Pipeline de agregación para obtener conteo por taller
    let pipeline = [
      { $match: filtros },
      {
        $addFields: {
          fechaOrdenamiento: {
            $ifNull: ["$auditoria.fechaCreacion", "$fechaCarga"]
          }
        }
      }
    ];

    // Agregar filtro de fecha si existe
    if (Object.keys(fechaFilter).length > 0) {
      pipeline.push({ $match: { fechaOrdenamiento: fechaFilter } });
    }

    // Agrupar por taller y contar
    pipeline.push(
      {
        $group: {
          _id: "$taller",
          orsCount: { $sum: 1 }
        }
      },
      {
        $sort: { orsCount: -1 }
      }
    );

    const resultado = await Presupuesto.aggregate(pipeline);
    
    // Convertir a objeto con taller como clave
    const orsPorTaller = {};
    resultado.forEach(item => {
      orsPorTaller[item._id] = item.orsCount;
    });

    res.json({ orsPorTaller });
  } catch (error) {
    console.error('Error al obtener ORs por taller:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ENDPOINTS DE ARCHIVOS ADJUNTOS =====

// Función para asegurar que el directorio existe
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const config = await obtenerConfiguracionGeneral();
      const uploadDir = config.directorioAdjuntos || 'server/uploads/adjuntos';
      ensureUploadDir(uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // Generar nombre único con UUID + extensión original
    const ext = path.extname(file.originalname);
    const uniqueName = crypto.randomUUID() + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB límite
  }
});

// POST - Subir archivo adjunto a un presupuesto
router.post('/:referencia/adjuntos', upload.single('archivo'), async (req, res) => {
  try {
    const { referencia } = req.params;
    const { usuario } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    if (!usuario) {
      return res.status(400).json({ error: 'Se requiere el nombre de usuario' });
    }

    // Buscar el presupuesto
    const presupuesto = await Presupuesto.findOne({ referencia });
    
    if (!presupuesto) {
      // Si no existe el presupuesto, eliminar el archivo subido
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    // Crear objeto de adjunto
    const adjunto = {
      nombreOriginal: req.file.originalname,
      nombreArchivo: req.file.filename,
      tamanio: req.file.size,
      tipo: req.file.mimetype,
      fechaSubida: new Date(),
      usuario: usuario
    };

    // Agregar adjunto al presupuesto
    presupuesto.adjuntos.push(adjunto);
    presupuesto.ultimaActualizacion = new Date();
    await presupuesto.save();

    res.json({
      message: 'Archivo subido correctamente',
      adjunto: adjunto
    });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    // Intentar eliminar el archivo si hubo error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo:', unlinkError);
      }
    }
    res.status(500).json({ error: error.message });
  }
});

// GET - Descargar archivo adjunto
router.get('/:referencia/adjuntos/:nombreArchivo', async (req, res) => {
  try {
    const { referencia, nombreArchivo } = req.params;

    // Buscar el presupuesto
    const presupuesto = await Presupuesto.findOne({ referencia });
    
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    // Buscar el adjunto en el array
    const adjunto = presupuesto.adjuntos.find(a => a.nombreArchivo === nombreArchivo);
    
    if (!adjunto) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Obtener configuración para el directorio
    const config = await obtenerConfiguracionGeneral();
    const uploadDir = config.directorioAdjuntos || 'server/uploads/adjuntos';
    const filePath = path.join(uploadDir, nombreArchivo);

    // Verificar que el archivo existe en disco
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado en disco' });
    }

    // Enviar el archivo con el nombre original
    res.download(filePath, adjunto.nombreOriginal);
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Eliminar archivo adjunto
router.delete('/:referencia/adjuntos/:nombreArchivo', async (req, res) => {
  try {
    const { referencia, nombreArchivo } = req.params;

    // Buscar el presupuesto
    const presupuesto = await Presupuesto.findOne({ referencia });
    
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    // Buscar el índice del adjunto
    const adjuntoIndex = presupuesto.adjuntos.findIndex(a => a.nombreArchivo === nombreArchivo);
    
    if (adjuntoIndex === -1) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Obtener configuración para el directorio
    const config = await obtenerConfiguracionGeneral();
    const uploadDir = config.directorioAdjuntos || 'server/uploads/adjuntos';
    const filePath = path.join(uploadDir, nombreArchivo);

    // Eliminar archivo físico si existe
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Eliminar del array de adjuntos
    presupuesto.adjuntos.splice(adjuntoIndex, 1);
    presupuesto.ultimaActualizacion = new Date();
    await presupuesto.save();

    res.json({ message: 'Archivo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
