const mongoose = require('mongoose');

const aceiteSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: [true, 'El SKU es obligatorio'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  litrosPorTambor: {
    type: Number,
    required: [true, 'Los litros por tambor son obligatorios'],
    min: [0.1, 'Los litros por tambor deben ser mayor a 0'],
    max: [1000, 'Los litros por tambor no pueden exceder 1000']
  },
  auditoria: {
    fechaCreacion: {
      type: Date,
      default: Date.now
    },
    fechaActualizacion: {
      type: Date,
      default: Date.now
    },
    usuarioCreacion: {
      type: String,
      default: 'sistema'
    },
    usuarioActualizacion: {
      type: String,
      default: 'sistema'
    }
  }
}, {
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
  collection: 'aceites'
});

// Middleware para actualizar fecha de actualización antes de guardar
aceiteSchema.pre('save', function(next) {
  this.auditoria.fechaActualizacion = new Date();
  next();
});

// Middleware para actualizar fecha de actualización antes de actualizar
aceiteSchema.pre('findOneAndUpdate', function(next) {
  this.set({ 'auditoria.fechaActualizacion': new Date() });
  next();
});

// Índices para optimizar consultas
aceiteSchema.index({ sku: 1 });
aceiteSchema.index({ 'auditoria.fechaCreacion': -1 });

// Método estático para buscar por SKU
aceiteSchema.statics.findBySku = function(sku) {
  return this.findOne({ sku: sku.toUpperCase().trim() });
};

// Método de instancia para obtener información resumida
aceiteSchema.methods.toSummary = function() {
  return {
    id: this._id,
    sku: this.sku,
    litrosPorTambor: this.litrosPorTambor,
    fechaCreacion: this.auditoria.fechaCreacion
  };
};

module.exports = mongoose.model('Aceite', aceiteSchema);






















