const express = require('express');
const router = express.Router();
const Aceite = require('../models/Aceite');

// GET /api/aceites - Obtener todos los aceites
router.get('/', async (req, res) => {
  try {
    const aceites = await Aceite.find({})
      .sort({ 'auditoria.fechaCreacion': -1 })
      .lean();
    
    res.json(aceites);
  } catch (error) {
    console.error('Error al obtener aceites:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/aceites/:id - Obtener un aceite por ID
router.get('/:id', async (req, res) => {
  try {
    const aceite = await Aceite.findById(req.params.id);
    
    if (!aceite) {
      return res.status(404).json({ error: 'Aceite no encontrado' });
    }
    
    res.json(aceite);
  } catch (error) {
    console.error('Error al obtener aceite:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/aceites - Crear un nuevo aceite
router.post('/', async (req, res) => {
  try {
    const { sku, litrosPorTambor } = req.body;
    
    // Validaciones
    if (!sku || !sku.trim()) {
      return res.status(400).json({ error: 'El SKU es obligatorio' });
    }
    
    if (!litrosPorTambor || isNaN(litrosPorTambor) || litrosPorTambor <= 0) {
      return res.status(400).json({ error: 'Los litros por tambor deben ser un número mayor a 0' });
    }
    
    // Verificar si ya existe un aceite con el mismo SKU
    const aceiteExistente = await Aceite.findBySku(sku);
    if (aceiteExistente) {
      return res.status(400).json({ error: 'Ya existe un aceite con este SKU' });
    }
    
    // Crear nuevo aceite
    const nuevoAceite = new Aceite({
      sku: sku.trim().toUpperCase(),
      litrosPorTambor: parseFloat(litrosPorTambor),
      auditoria: {
        fechaCreacion: new Date(),
        fechaActualizacion: new Date(),
        usuarioCreacion: req.ip || 'sistema',
        usuarioActualizacion: req.ip || 'sistema'
      }
    });
    
    const aceiteGuardado = await nuevoAceite.save();
    
    res.status(201).json({
      message: 'Aceite creado exitosamente',
      aceite: aceiteGuardado
    });
  } catch (error) {
    console.error('Error al crear aceite:', error);
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errores.join(', ') });
    }
    
    // Manejar errores de duplicado
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya existe un aceite con este SKU' });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/aceites/:id - Actualizar un aceite
router.put('/:id', async (req, res) => {
  try {
    const { sku, litrosPorTambor } = req.body;
    
    // Validaciones
    if (!sku || !sku.trim()) {
      return res.status(400).json({ error: 'El SKU es obligatorio' });
    }
    
    if (!litrosPorTambor || isNaN(litrosPorTambor) || litrosPorTambor <= 0) {
      return res.status(400).json({ error: 'Los litros por tambor deben ser un número mayor a 0' });
    }
    
    // Verificar si ya existe otro aceite con el mismo SKU
    const aceiteExistente = await Aceite.findBySku(sku);
    if (aceiteExistente && aceiteExistente._id.toString() !== req.params.id) {
      return res.status(400).json({ error: 'Ya existe otro aceite con este SKU' });
    }
    
    // Actualizar aceite
    const aceiteActualizado = await Aceite.findByIdAndUpdate(
      req.params.id,
      {
        sku: sku.trim().toUpperCase(),
        litrosPorTambor: parseFloat(litrosPorTambor),
        'auditoria.fechaActualizacion': new Date(),
        'auditoria.usuarioActualizacion': req.ip || 'sistema'
      },
      { new: true, runValidators: true }
    );
    
    if (!aceiteActualizado) {
      return res.status(404).json({ error: 'Aceite no encontrado' });
    }
    
    res.json({
      message: 'Aceite actualizado exitosamente',
      aceite: aceiteActualizado
    });
  } catch (error) {
    console.error('Error al actualizar aceite:', error);
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errores.join(', ') });
    }
    
    // Manejar errores de duplicado
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya existe un aceite con este SKU' });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/aceites/:id - Eliminar un aceite
router.delete('/:id', async (req, res) => {
  try {
    const aceiteEliminado = await Aceite.findByIdAndDelete(req.params.id);
    
    if (!aceiteEliminado) {
      return res.status(404).json({ error: 'Aceite no encontrado' });
    }
    
    res.json({
      message: 'Aceite eliminado exitosamente',
      aceite: aceiteEliminado
    });
  } catch (error) {
    console.error('Error al eliminar aceite:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/aceites/search/:sku - Buscar aceite por SKU
router.get('/search/:sku', async (req, res) => {
  try {
    const aceite = await Aceite.findBySku(req.params.sku);
    
    if (!aceite) {
      return res.status(404).json({ error: 'Aceite no encontrado' });
    }
    
    res.json(aceite);
  } catch (error) {
    console.error('Error al buscar aceite:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;





















