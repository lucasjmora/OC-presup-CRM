const mongoose = require('mongoose');
const Presupuesto = require('../models/Presupuesto');
const config = require('../config/database');

// Script de migración para mover datos de piezas desde campos legacy al array piezas
async function migrarPiezas() {
  try {
    console.log('🚀 Iniciando migración de piezas...');
    
    // Verificar si mongoose ya está conectado
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.uri);
      console.log('📡 Conectado a la base de datos');
    } else {
      console.log('📡 Usando conexión existente a la base de datos');
    }

    // Buscar todos los presupuestos que tienen datos legacy pero array de piezas vacío
    const presupuestos = await Presupuesto.find({
      $and: [
        {
          $or: [
            { piezas: { $exists: false } },
            { piezas: { $size: 0 } }
          ]
        },
        {
          $or: [
            // Casos normales con pieza
            { pieza: { $exists: true, $ne: '', $ne: null } },
            // Casos especiales sin pieza pero con concepto e importe
            {
              $and: [
                { concepto: { $exists: true, $ne: '', $ne: null } },
                { importe: { $gt: 0 } }
              ]
            }
          ]
        }
      ]
    });

    console.log(`📊 Encontrados ${presupuestos.length} presupuestos para migrar`);

    let migrados = 0;
    let errores = 0;
    const erroresDetalle = [];

    for (const presupuesto of presupuestos) {
      try {
        // Migrar si hay datos legacy (pieza o al menos concepto + importe)
        const tienePieza = presupuesto.pieza && presupuesto.pieza.trim() !== '';
        const tieneConceptoEImporte = presupuesto.concepto && presupuesto.concepto.trim() !== '' && presupuesto.importe > 0;
        
        if (tienePieza || tieneConceptoEImporte) {
          // Crear objeto de pieza desde datos legacy
          const piezaMigrada = {
            pieza: presupuesto.pieza || 'N/A', // Si no hay pieza, usar N/A
            concepto: presupuesto.concepto || '',
            cantidad: 1, // Por defecto 1 para datos legacy
            costo: presupuesto.costo || 0,
            pvp: presupuesto.pvp || 0,
            importe: presupuesto.importe || 0
          };

          // Actualizar el presupuesto agregando la pieza al array
          await Presupuesto.findByIdAndUpdate(
            presupuesto._id,
            {
              $set: {
                piezas: [piezaMigrada],
                ultimaActualizacion: new Date(),
                'auditoria.modificadoPor': 'Sistema Migración',
                'auditoria.fechaModificacion': new Date()
              }
            },
            { new: true }
          );

          migrados++;
          
          if (migrados % 50 === 0) {
            console.log(`⏳ Progreso: ${migrados}/${presupuestos.length} presupuestos migrados`);
          }
        }
      } catch (error) {
        errores++;
        erroresDetalle.push({
          referencia: presupuesto.referencia,
          error: error.message
        });
        console.error(`❌ Error al migrar presupuesto ${presupuesto.referencia}:`, error.message);
      }
    }

    console.log('\n✅ Migración completada:');
    console.log(`📈 Presupuestos migrados exitosamente: ${migrados}`);
    console.log(`❌ Errores: ${errores}`);
    
    if (erroresDetalle.length > 0) {
      console.log('\n📋 Detalle de errores:');
      erroresDetalle.slice(0, 10).forEach(error => {
        console.log(`  - ${error.referencia}: ${error.error}`);
      });
      if (erroresDetalle.length > 10) {
        console.log(`  ... y ${erroresDetalle.length - 10} errores más`);
      }
    }

    // Verificar algunos presupuestos migrados
    console.log('\n🔍 Verificando migración...');
    const verificacion = await Presupuesto.aggregate([
      {
        $match: {
          piezas: { $size: 1 }
        }
      },
      {
        $project: {
          referencia: 1,
          'piezas.pieza': 1,
          'piezas.concepto': 1,
          'piezas.costo': 1,
          'piezas.pvp': 1,
          'piezas.importe': 1
        }
      },
      { $limit: 5 }
    ]);

    console.log('📋 Muestra de presupuestos migrados:');
    verificacion.forEach(p => {
      const pieza = p.piezas[0];
      console.log(`  - ${p.referencia}: ${pieza.pieza} - ${pieza.concepto} (${pieza.costo}/${pieza.pvp}/${pieza.importe})`);
    });

    return {
      migrados,
      errores,
      total: presupuestos.length
    };

  } catch (error) {
    console.error('💥 Error en la migración:', error);
    throw error;
  } finally {
    // Solo desconectar si estamos ejecutando desde línea de comandos
    if (require.main === module) {
      await mongoose.disconnect();
      console.log('📡 Desconectado de la base de datos');
    }
  }
}

// Función para crear endpoint temporal de migración
function crearEndpointMigracion(app) {
  app.post('/api/migration/migrate-piezas', async (req, res) => {
    try {
      const resultado = await migrarPiezas();
      res.json({
        success: true,
        message: 'Migración completada exitosamente',
        resultado
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error en la migración',
        error: error.message
      });
    }
  });
}

// Si se ejecuta directamente desde línea de comandos
if (require.main === module) {
  migrarPiezas()
    .then(() => {
      console.log('🎉 Migración finalizada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrarPiezas, crearEndpointMigracion };
