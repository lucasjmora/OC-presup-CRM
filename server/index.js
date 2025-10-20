const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const presupuestosRoutes = require('./routes/presupuestos');
const configuracionRoutes = require('./routes/configuracion');
const configuracionGeneralRoutes = require('./routes/configuracionGeneral');
const uploadRoutes = require('./routes/upload');
const talleresRoutes = require('./routes/talleres');
const schedulerRoutes = require('./routes/scheduler');
const aceitesRoutes = require('./routes/aceites');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos cuando el build existe (ANTES de las rutas API)
const buildPath = path.join(__dirname, '../client/build');
if (require('fs').existsSync(buildPath)) {
  app.use(express.static(buildPath));
}

// Rutas API
app.use('/api/presupuestos', presupuestosRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/configuracion/general', configuracionGeneralRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/talleres', talleresRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/aceites', aceitesRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// Servir la aplicación React para todas las rutas no-API cuando el build existe
const indexPath = path.join(__dirname, '../client/build/index.html');
if (require('fs').existsSync(indexPath)) {
  app.get('*', (req, res) => {
    res.sendFile(indexPath);
  });
} else {
  // Si no hay build, solo manejar rutas API
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });
}

// Conexión a MongoDB
const connectDB = async () => {
  try {
    const config = require('./config/database');
    if (!config.uri || config.uri === "mongodb://localhost:27017") {
      console.log('⚠️  MongoDB no configurado. Usa el menú de configuración para configurar la conexión.');
      return false;
    }
    
    // Construir la URI completa con la base de datos
    const uriWithDB = config.uri.endsWith('/') 
      ? `${config.uri}${config.database}?retryWrites=true&w=majority`
      : `${config.uri}/${config.database}?retryWrites=true&w=majority`;
    
    await mongoose.connect(uriWithDB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ Conectado a MongoDB - Base de datos: ${config.database}`);
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    console.log('⚠️  Usa el menú de configuración para verificar la URI de MongoDB.');
    return false;
  }
};

// Iniciar servidor
const startServer = async () => {
  const dbConnected = await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 Acceso local: http://localhost:${PORT}`);
    console.log(`🌐 Acceso desde red: http://[TU_IP]:${PORT}`);
    if (!dbConnected) {
      console.log('📝 Ve a http://localhost:3000/configuracion para configurar MongoDB');
    }
  });
};

startServer();
