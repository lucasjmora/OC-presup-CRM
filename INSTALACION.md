# Guía de Instalación - OC Presup CRM

## 📋 Requisitos Previos

### Software Requerido
- **Node.js** (versión 16 o superior)
  - Descargar desde: https://nodejs.org/
  - Incluye npm automáticamente
- **MongoDB** (opcional para desarrollo local)
  - Descargar desde: https://www.mongodb.com/try/download/community
  - O usar MongoDB Atlas (servicio en la nube)

### Verificar Instalaciones
```bash
# Verificar Node.js
node --version
npm --version

# Verificar MongoDB (si está instalado localmente)
mongod --version
```

## 🚀 Instalación Automática

### Windows (PowerShell)
```powershell
# Ejecutar el script de instalación
.\install.ps1

# Con limpieza previa (recomendado para instalaciones frescas)
.\install.ps1 -Clean

# Saltar verificaciones (si ya tienes todo instalado)
.\install.ps1 -SkipNodeCheck -SkipMongoCheck
```

### Linux/macOS (Bash)
```bash
# Hacer ejecutable el script (solo la primera vez)
chmod +x install.sh

# Ejecutar el script de instalación
./install.sh

# Con limpieza previa
./install.sh --clean

# Ver opciones disponibles
./install.sh --help
```

## 🔧 Instalación Manual

Si prefieres instalar manualmente o los scripts no funcionan:

### 1. Instalar dependencias del directorio raíz
```bash
npm install
```

### 2. Instalar dependencias del servidor
```bash
cd server
npm install
cd ..
```

### 3. Instalar dependencias del cliente
```bash
cd client
npm install
cd ..
```

### 4. Verificar instalación
```bash
npm run install-all
```

## ⚙️ Configuración

### 1. Configurar Base de Datos
Editar `server/config/database.js`:
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Para MongoDB local
    await mongoose.connect('mongodb://localhost:27017/oc-presup-crm');
    
    // Para MongoDB Atlas
    // await mongoose.connect('mongodb+srv://usuario:password@cluster.mongodb.net/oc-presup-crm');
    
    console.log('MongoDB conectado');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### 2. Configurar Archivo Excel
Editar `server/data/config.json`:
```json
{
  "excelPath": "C:\\ruta\\a\\tu\\archivo.xlsx",
  "excelSheet": "Hoja1",
  "columns": {
    "referencia": "A",
    "fecha": "B",
    "cta": "C",
    "nombre": "D",
    "taller": "E",
    "pieza": "F",
    "concepto": "G",
    "costo": "H",
    "pvp": "I",
    "importe": "J",
    "usuario": "K",
    "descripcionSiniestro": "L"
  }
}
```

## 🏃‍♂️ Ejecutar la Aplicación

### Modo Desarrollo
```bash
npm run dev
```
Esto iniciará:
- Servidor backend en http://localhost:5000
- Cliente frontend en http://localhost:3000

### Modo Producción
```bash
# Construir aplicación
npm run build

# Iniciar solo servidor
npm run server
```

## 📁 Estructura del Proyecto

```
oc-presup-crm/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── pages/         # Páginas de la aplicación
│   │   └── services/      # Servicios API
│   └── package.json
├── server/                # Backend Node.js/Express
│   ├── config/           # Configuraciones
│   ├── models/           # Modelos MongoDB
│   ├── routes/           # Rutas API
│   └── package.json
├── jsons/                # Archivos JSON de ejemplo
├── install.ps1          # Script de instalación Windows
├── install.sh           # Script de instalación Unix/Linux
└── package.json         # Dependencias raíz
```

## 🛠️ Comandos Útiles

### Gestión de Dependencias
```bash
# Instalar todas las dependencias
npm run install-all

# Limpiar node_modules
npm run clean

# Limpiar e instalar todo
npm run clean-and-install
```

### Desarrollo
```bash
# Iniciar aplicación completa
npm run dev

# Solo servidor
npm run server

# Solo cliente
npm run client
```

### Reinicio Completo
```bash
# Windows (PowerShell)
.\restart.ps1              # Reinicio normal
.\restart.ps1 -Clean       # Reinicio con limpieza
.\restart.ps1 -Force       # Reinicio forzado

# Windows (Batch)
restart.bat                # Reinicio con confirmación

# Linux/macOS (Bash)
./restart.sh               # Reinicio normal
./restart.sh --clean       # Reinicio con limpieza
./restart.sh --force       # Reinicio forzado
```

### Producción
```bash
# Construir aplicación
npm run build

# Iniciar servidor de producción
npm start
```

## 🔍 Solución de Problemas

### Error: "Node.js no está instalado"
- Descargar e instalar Node.js desde https://nodejs.org/
- Reiniciar terminal después de la instalación

### Error: "npm no está instalado"
- Node.js incluye npm automáticamente
- Si persiste, reinstalar Node.js

### Error: "MongoDB no está conectado"
- Verificar que MongoDB esté ejecutándose
- Verificar la cadena de conexión en `server/config/database.js`
- Para MongoDB local: `mongodb://localhost:27017/oc-presup-crm`

### Error: "Puerto ya en uso"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:3000 | xargs kill -9
```

### Error: "Módulos no encontrados"
```bash
# Limpiar e reinstalar
npm run clean-and-install
```

## 📞 Soporte

Si encuentras problemas durante la instalación:

1. Verifica que tienes Node.js versión 16 o superior
2. Asegúrate de ejecutar los scripts desde el directorio raíz del proyecto
3. Revisa los logs de error para más detalles
4. Intenta la instalación manual paso a paso

## 🎯 Próximos Pasos

Después de la instalación exitosa:

1. Configura la conexión a MongoDB
2. Configura la ruta del archivo Excel
3. Ejecuta `npm run dev`
4. Abre http://localhost:3000 en tu navegador
5. ¡Disfruta usando OC Presup CRM!
