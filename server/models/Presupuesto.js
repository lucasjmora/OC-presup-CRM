const mongoose = require('mongoose');
const Aceite = require('./Aceite');

// Schema para piezas individuales
const piezaSchema = new mongoose.Schema({
  pieza: {
    type: String,
    required: true
  },
  concepto: {
    type: String,
    required: true
  },
  cantidad: {
    type: Number,
    default: 1
  },
  costo: {
    type: Number,
    default: 0
  },
  pvp: {
    type: Number,
    default: 0
  },
  importe: {
    type: Number,
    default: 0
  }
}, { _id: false });

// Schema para comentarios
const comentarioSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  texto: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    required: true
  },
  usuario: {
    type: String,
    required: true
  }
}, { _id: false });

// Schema para archivos adjuntos
const adjuntoSchema = new mongoose.Schema({
  nombreOriginal: {
    type: String,
    required: true
  },
  nombreArchivo: {
    type: String,
    required: true
  },
  tamanio: {
    type: Number,
    required: true
  },
  tipo: {
    type: String,
    required: true
  },
  fechaSubida: {
    type: Date,
    default: Date.now
  },
  usuario: {
    type: String,
    required: true
  }
}, { _id: false });

const presupuestoSchema = new mongoose.Schema({
  referencia: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  cta: {
    type: String,
    required: true
  },
  nombre: {
    type: String,
    required: true
  },
  taller: {
    type: String,
    required: true
  },
  usuario: {
    type: String,
    required: true
  },
  descripcionSiniestro: {
    type: String,
    required: true
  },
  orSiniestro: {
    type: String,
    default: '',
    maxlength: 15
  },
  // Campo de estado del presupuesto
  estado: {
    type: String,
    enum: ['Abierto', 'Rechazado', 'Aceptado'],
    default: 'Abierto',
    required: true,
    index: true
  },
  // Array de piezas en lugar de una sola pieza
  piezas: [piezaSchema],
  // Array de comentarios
  comentarios: [comentarioSchema],
  // Array de archivos adjuntos
  adjuntos: [adjuntoSchema],
  // Campos calculados para compatibilidad
  pieza: {
    type: String,
    default: function() {
      return this.piezas && this.piezas.length > 0 ? this.piezas[0].pieza : '';
    }
  },
  concepto: {
    type: String,
    default: function() {
      return this.piezas && this.piezas.length > 0 ? this.piezas[0].concepto : '';
    }
  },
  costo: {
    type: Number,
    default: function() {
      return this.piezas ? this.piezas.reduce((sum, p) => sum + (p.costo || 0), 0) : 0;
    }
  },
  pvp: {
    type: Number,
    default: function() {
      return this.piezas ? this.piezas.reduce((sum, p) => sum + (p.pvp || 0), 0) : 0;
    }
  },
  importe: {
    type: Number,
    default: function() {
      return this.piezas ? this.piezas.reduce((sum, p) => sum + (p.importe || 0), 0) : 0;
    }
  },
  fechaCarga: {
    type: Date,
    default: Date.now
  },
  ultimaActualizacion: {
    type: Date,
    default: Date.now
  },
  // Campos de auditoría
  auditoria: {
    creadoPor: {
      type: String,
      required: false
    },
    fechaCreacion: {
      type: Date,
      default: Date.now
    },
    modificadoPor: {
      type: String,
      default: null
    },
    fechaModificacion: {
      type: Date,
      default: null
    },
    estadoCambiadoPor: {
      type: String,
      default: null
    },
    fechaCambioEstado: {
      type: Date,
      default: null
    },
    estadoAnterior: {
      type: String,
      default: null
    }
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
presupuestoSchema.index({ referencia: 1, fecha: -1 });
presupuestoSchema.index({ nombre: 1 });
presupuestoSchema.index({ descripcionSiniestro: 1 });
presupuestoSchema.index({ fecha: -1 });
presupuestoSchema.index({ taller: 1 });
presupuestoSchema.index({ estado: 1 });

// Método estático para verificar si existe una referencia
presupuestoSchema.statics.existeReferencia = async function(referencia) {
  const count = await this.countDocuments({ referencia });
  return count > 0;
};

// Método para obtener estadísticas
presupuestoSchema.statics.getEstadisticas = async function(filtros = {}) {
  const matchStage = {};
  
  // Agregar filtros de fecha si se proporcionan
  if (filtros.fecha && Object.keys(filtros.fecha).length > 0) {
    matchStage.fecha = filtros.fecha;
  }

  const pipeline = [];
  
  // Agregar etapa de filtro si hay filtros
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
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
  
  const stats = await this.aggregate(pipeline);
  
  return stats[0] || {
    totalPresupuestos: 0,
    totalImporte: 0,
    totalCosto: 0,
    totalPvp: 0,
    margen: 0
  };
};

// Método para obtener meses disponibles con registros
presupuestoSchema.statics.getMesesDisponibles = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: {
          year: { $year: { $ifNull: ["$auditoria.fechaCreacion", "$fechaCarga"] } },
          month: { $month: { $ifNull: ["$auditoria.fechaCreacion", "$fechaCarga"] } }
        },
        cantidad: { $addToSet: "$referencia" },
        totalImporte: { $sum: "$importe" }
      }
    },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        cantidad: { $size: "$cantidad" },
        totalImporte: 1
      }
    },
    {
      $sort: { year: -1, month: -1 }
    }
  ]);
};

// Método para obtener presupuestos por tipo de siniestro
presupuestoSchema.statics.getPorTipoSiniestro = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: "$descripcionSiniestro",
        cantidad: { $addToSet: "$referencia" },
        totalImporte: { $sum: "$importe" }
      }
    },
    {
      $project: {
        tipo: "$_id",
        cantidad: { $size: "$cantidad" },
        totalImporte: 1,
        _id: 0
      }
    },
    {
      $sort: { totalImporte: -1 }
    }
  ]);
};

// Método para obtener estadísticas por taller
presupuestoSchema.statics.getEstadisticasPorTaller = async function(filtros = {}) {
  const matchStage = {};
  
  // Agregar filtros de fecha si se proporcionan
  if (filtros.fecha && Object.keys(filtros.fecha).length > 0) {
    matchStage.fecha = filtros.fecha;
  }

  const pipeline = [];
  
  // Agregar etapa de filtro si hay filtros
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }
  
  pipeline.push(
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
    {
      $group: {
        _id: "$nombreTaller",
        cantidad: { $addToSet: "$referencia" },
        totalImporte: { $sum: "$importe" }
      }
    },
    {
      $project: {
        taller: "$_id",
        cantidad: { $size: "$cantidad" },
        totalImporte: 1,
        _id: 0
      }
    },
    {
      $sort: { cantidad: -1 }
    }
  );
  
  return await this.aggregate(pipeline);
};

// Método para obtener estadísticas por estado
presupuestoSchema.statics.getEstadisticasPorEstado = async function(filtros = {}) {
  const matchStage = {};
  
  // Agregar filtros de fecha si se proporcionan
  if (filtros.fecha && Object.keys(filtros.fecha).length > 0) {
    matchStage.fecha = filtros.fecha;
  }

  const pipeline = [];
  
  // Agregar etapa de filtro si hay filtros
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }
  
  pipeline.push(
    {
      $group: {
        _id: "$estado",
        cantidad: { $addToSet: "$referencia" },
        totalImporte: { $sum: "$importe" },
        totalCosto: { $sum: "$costo" },
        totalPvp: { $sum: "$pvp" }
      }
    },
    {
      $project: {
        estado: "$_id",
        cantidad: { $size: "$cantidad" },
        totalImporte: 1,
        totalCosto: 1,
        totalPvp: 1,
        margen: {
          $cond: {
            if: { $eq: ["$totalImporte", 0] },
            then: 0,
            else: { $multiply: [{ $divide: [{ $subtract: ["$totalImporte", "$totalCosto"] }, "$totalImporte"] }, 100] }
          }
        },
        _id: 0
      }
    },
    {
      $sort: { cantidad: -1 }
    }
  );
  
  return await this.aggregate(pipeline);
};

// Método para calcular el subestado de un presupuesto abierto
presupuestoSchema.methods.calcularSubestado = function(diasParaPendiente = 2) {
  // Solo aplicar subestados a presupuestos abiertos
  if (this.estado !== 'Abierto') {
    return null;
  }

  // Obtener la fecha de creación del presupuesto
  const fechaCreacion = this.auditoria?.fechaCreacion || this.fechaCarga;
  
  // Si no hay comentarios, calcular desde la fecha de creación
  if (!this.comentarios || this.comentarios.length === 0) {
    const ahora = new Date();
    const diferenciaHoras = (ahora - fechaCreacion) / (1000 * 60 * 60);
    const horasParaPendiente = diasParaPendiente * 24;
    
    // Si han pasado más horas que las configuradas desde la creación, es pendiente
    if (diferenciaHoras > horasParaPendiente) {
      return 'Pendiente';
    }
    
    // Si no han pasado las horas configuradas desde la creación, está en espera
    return 'En espera';
  }

  // Si hay comentarios, obtener el comentario más reciente
  const comentarioMasReciente = this.comentarios.reduce((masReciente, comentario) => {
    return comentario.fecha > masReciente.fecha ? comentario : masReciente;
  });

  // Usar la fecha más reciente entre la creación y el último comentario
  const fechaReferencia = comentarioMasReciente.fecha > fechaCreacion 
    ? comentarioMasReciente.fecha 
    : fechaCreacion;

  // Calcular la diferencia en horas desde la fecha de referencia
  const ahora = new Date();
  const diferenciaHoras = (ahora - fechaReferencia) / (1000 * 60 * 60);
  
  // Convertir días a horas
  const horasParaPendiente = diasParaPendiente * 24;

  // Si han pasado más horas que las configuradas, es pendiente
  if (diferenciaHoras > horasParaPendiente) {
    return 'Pendiente';
  }

  // Si no han pasado las horas configuradas, está en espera
  return 'En espera';
};

// Método estático para agregar subestado a múltiples presupuestos
presupuestoSchema.statics.agregarSubestado = function(presupuestos, diasParaPendiente = 2) {
  return presupuestos.map(presupuesto => {
    const presupuestoObj = presupuesto.toObject ? presupuesto.toObject() : presupuesto;
    presupuestoObj.subestado = presupuesto.calcularSubestado(diasParaPendiente);
    return presupuestoObj;
  });
};

// Método para detectar si una pieza es un aceite (solo verifica tabla de aceites)
presupuestoSchema.methods.esAceite = async function(sku) {
  try {
    const aceite = await Aceite.findBySku(sku);
    return !!aceite; // Retorna true solo si está en la tabla de aceites
  } catch (error) {
    console.error('Error al verificar si es aceite:', error);
    return false;
  }
};

// Método para obtener información de aceite por SKU
presupuestoSchema.methods.obtenerInfoAceite = async function(sku) {
  try {
    const aceite = await Aceite.findBySku(sku);
    return aceite;
  } catch (error) {
    console.error('Error al buscar aceite por SKU:', error);
    return null;
  }
};

// Método para calcular costo y PVP correctos para aceites
presupuestoSchema.methods.calcularCostoPvpAceite = async function(pieza) {
  try {
    // Verificar si es un aceite (debe estar registrado en la tabla de aceites)
    const esAceite = await this.esAceite(pieza.pieza);
    
    if (!esAceite) {
      return {
        costo: pieza.costo || 0,
        pvp: pieza.pvp || 0,
        esAceite: false
      };
    }

    // Buscar información del aceite
    const infoAceite = await this.obtenerInfoAceite(pieza.pieza);
    
    if (!infoAceite || !infoAceite.litrosPorTambor) {
      // Si no se encuentra información del aceite, usar valores originales
      return {
        costo: pieza.costo || 0,
        pvp: pieza.pvp || 0,
        esAceite: false,
        infoAceite: null
      };
    }

    // Calcular costo por litro: costo total / litros por tambor
    const costoPorLitro = (pieza.costo || 0) / infoAceite.litrosPorTambor;
    
    // Calcular PVP por litro: PVP total / litros por tambor
    const pvpPorLitro = (pieza.pvp || 0) / infoAceite.litrosPorTambor;
    
    // Aplicar la cantidad del presupuesto
    const costoFinal = costoPorLitro * (pieza.cantidad || 1);
    const pvpFinal = pvpPorLitro * (pieza.cantidad || 1);

    return {
      costo: costoFinal,
      pvp: pvpFinal,
      esAceite: true,
      infoAceite: {
        sku: infoAceite.sku,
        litrosPorTambor: infoAceite.litrosPorTambor
      },
      calculosAceite: {
        costoPorLitro,
        pvpPorLitro,
        cantidad: pieza.cantidad || 1
      }
    };
  } catch (error) {
    console.error('Error al calcular costo/PVP de aceite:', error);
    return {
      costo: pieza.costo || 0,
      pvp: pieza.pvp || 0,
      esAceite: false,
      error: error.message
    };
  }
};

// Método estático para procesar presupuestos con cálculo de aceites
    presupuestoSchema.statics.procesarConAceites = async function(presupuestos) {
      const presupuestosProcesados = [];
      
      for (const presupuesto of presupuestos) {
        const presupuestoObj = presupuesto.toObject ? presupuesto.toObject() : presupuesto;
        
        // Procesar todas las piezas que sean aceites
        if (presupuestoObj.piezas && presupuestoObj.piezas.length > 0) {
          let tieneAceites = false;
          
          for (const pieza of presupuestoObj.piezas) {
            // Verificar si la pieza es un aceite (debe estar registrada en la tabla de aceites)
            if (pieza.pieza) {
              // Buscar información del aceite en la base de datos
              const Aceite = require('./Aceite');
              const aceiteInfo = await Aceite.findOne({ sku: pieza.pieza });
              
              if (aceiteInfo) {
                // Calcular valores corregidos
                const litrosPorTambor = aceiteInfo.litrosPorTambor;
                const costoPorLitro = pieza.costo / litrosPorTambor;
                const pvpPorLitro = pieza.pvp / litrosPorTambor;
                
                // La cantidad ya son litros, no tambores
                const costoFinal = costoPorLitro * pieza.cantidad;
                const pvpFinal = pvpPorLitro * pieza.cantidad;
                
                // Actualizar la pieza
                pieza.costoCalculado = costoFinal;
                pieza.pvpCalculado = pvpFinal;
                // El importe se mantiene como está en la base de datos
                pieza.esAceite = true;
                pieza.infoAceite = {
                  sku: aceiteInfo.sku,
                  litrosPorTambor: aceiteInfo.litrosPorTambor
                };
                pieza.calculosAceite = {
                  costoPorLitro: costoPorLitro,
                  pvpPorLitro: pvpPorLitro,
                  cantidad: pieza.cantidad
                };
                
                tieneAceites = true;
              }
            }
          }
          
          // Si se procesaron aceites, recalcular totales del presupuesto
          if (tieneAceites) {
            presupuestoObj.costoCalculado = presupuestoObj.piezas.reduce((sum, p) => {
              return sum + (p.costoCalculado !== undefined ? p.costoCalculado : p.costo);
            }, 0);
            presupuestoObj.pvpCalculado = presupuestoObj.piezas.reduce((sum, p) => {
              return sum + (p.pvpCalculado !== undefined ? p.pvpCalculado : p.pvp);
            }, 0);
            // El importe total se mantiene como está en la base de datos
            presupuestoObj.importeCalculado = presupuestoObj.importe;
          }
        }
        
        presupuestosProcesados.push(presupuestoObj);
      }
      
      return presupuestosProcesados;
    };

// Obtener la configuración de la base de datos
const config = require('../config/database');

// Crear el modelo con la base de datos y colección específicas
const Presupuesto = mongoose.model('Presupuesto', presupuestoSchema, config.collection);

module.exports = Presupuesto;
