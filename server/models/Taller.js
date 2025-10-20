const mongoose = require('mongoose');

const talleresSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    unique: true
  },
  nombre: {
    type: String,
    required: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento
talleresSchema.index({ nombre: 1 });
talleresSchema.index({ activo: 1 });

// Método estático para obtener todos los talleres activos
talleresSchema.statics.getTalleresActivos = async function() {
  return await this.find({ activo: true }).sort({ nombre: 1 });
};

// Método estático para obtener un taller por código
talleresSchema.statics.getTallerPorCodigo = async function(codigo) {
  return await this.findOne({ codigo: codigo, activo: true });
};

// Método estático para obtener el nombre del taller por código
talleresSchema.statics.getNombreTaller = async function(codigo) {
  const taller = await this.findOne({ codigo: codigo, activo: true });
  return taller ? taller.nombre : codigo; // Si no existe, devuelve el código
};

// Obtener la configuración de la base de datos
const config = require('../config/database');

// Crear el modelo con la base de datos específica
const Taller = mongoose.model('Taller', talleresSchema, 'talleres');

module.exports = Taller;
