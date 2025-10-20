const express = require('express');
const router = express.Router();
const Taller = require('../models/Taller');

// GET - Obtener todos los talleres
router.get('/', async (req, res) => {
  try {
    const talleres = await Taller.find().sort({ nombre: 1 });
    res.json(talleres);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener talleres activos
router.get('/activos', async (req, res) => {
  try {
    const talleres = await Taller.getTalleresActivos();
    res.json(talleres);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener un taller por código
router.get('/:codigo', async (req, res) => {
  try {
    const taller = await Taller.getTallerPorCodigo(req.params.codigo);
    
    if (!taller) {
      return res.status(404).json({ error: 'Taller no encontrado' });
    }

    res.json(taller);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Crear un nuevo taller
router.post('/', async (req, res) => {
  try {
    const { codigo, nombre } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({ error: 'Código y nombre son requeridos' });
    }

    // Verificar si ya existe un taller con ese código
    const tallerExistente = await Taller.findOne({ codigo: codigo });
    if (tallerExistente) {
      return res.status(400).json({ error: 'Ya existe un taller con ese código' });
    }

    const nuevoTaller = new Taller({
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      activo: true
    });

    await nuevoTaller.save();

    res.status(201).json({
      message: 'Taller creado correctamente',
      taller: nuevoTaller
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - Actualizar un taller
router.put('/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { nombre, activo } = req.body;

    const datosActualizados = {
      fechaActualizacion: new Date()
    };

    if (nombre !== undefined) {
      datosActualizados.nombre = nombre.trim();
    }

    if (activo !== undefined) {
      datosActualizados.activo = activo;
    }

    const taller = await Taller.findOneAndUpdate(
      { codigo: codigo },
      datosActualizados,
      { new: true }
    );

    if (!taller) {
      return res.status(404).json({ error: 'Taller no encontrado' });
    }

    res.json({
      message: 'Taller actualizado correctamente',
      taller: taller
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Eliminar un taller (marcar como inactivo)
router.delete('/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;

    const taller = await Taller.findOneAndUpdate(
      { codigo: codigo },
      { 
        activo: false,
        fechaActualizacion: new Date()
      },
      { new: true }
    );

    if (!taller) {
      return res.status(404).json({ error: 'Taller no encontrado' });
    }

    res.json({
      message: 'Taller eliminado correctamente',
      taller: taller
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener códigos únicos de talleres desde presupuestos
router.get('/stats/codigos-unicos', async (req, res) => {
  try {
    const Presupuesto = require('../models/Presupuesto');
    const codigosUnicos = await Presupuesto.distinct('taller');
    
    // Filtrar solo códigos numéricos o que parezcan códigos
    const codigosFiltrados = codigosUnicos
      .filter(codigo => codigo && codigo.toString().trim() !== '')
      .sort();

    res.json(codigosFiltrados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;







