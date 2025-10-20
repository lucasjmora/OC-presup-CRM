# 🚀 Instrucciones para Iniciar la Aplicación en Modo Producción

## 📋 Opciones de Inicio

### 1. **Scripts Automatizados (Recomendado)**

#### Para PowerShell (Windows):
```powershell
npm run start-production
```
o directamente:
```powershell
.\start-server.ps1
```

#### Para Command Prompt (Windows):
```cmd
npm run start-production-bat
```
o directamente:
```cmd
start-server.bat
```

### 2. **Scripts NPM**

#### Construcción manual + inicio:
```bash
npm run start-prod
```

#### Solo servidor (requiere build previo):
```bash
npm start
```

## 🔧 Funcionalidades de los Scripts

### ✅ **Verificaciones Automáticas:**
- ✅ Verifica que el build del cliente existe
- ✅ Construye automáticamente el cliente si es necesario
- ✅ Configura `NODE_ENV=production`
- ✅ Muestra información de acceso (URLs locales y de red)

### 🌐 **URLs de Acceso:**
- **Local**: http://localhost:5000
- **Red**: http://[TU_IP]:5000

### 🛡️ **Características de Seguridad:**
- ✅ Helmet para headers de seguridad
- ✅ CORS configurado
- ✅ Morgan para logging
- ✅ Validación de archivos estáticos

## 📁 **Estructura de Archivos Requerida:**
```
OC Presup CRM/
├── client/
│   └── build/          # ← Construido automáticamente
│       ├── index.html
│       └── static/
├── server/
│   ├── index.js        # ← Servidor principal
│   └── ...
├── start-server.ps1    # ← Script PowerShell
├── start-server.bat    # ← Script Command Prompt
└── package.json        # ← Scripts NPM
```

## 🚨 **Solución de Problemas:**

### Si el build no existe:
Los scripts automáticamente ejecutarán:
```bash
cd client && npm run build
```

### Si hay errores de dependencias:
```bash
npm run install-all
```

### Para limpiar e instalar todo:
```bash
npm run clean-and-install
```

## 📊 **Características Implementadas:**

### 🎯 **Subestados para Presupuestos Abiertos:**
- **"Pendiente"**: Fondo rojo (sin comentarios o >48hs)
- **"En espera"**: Fondo amarillo (comentarios recientes)

### 🎨 **Interfaz Optimizada:**
- Columna "Taller" con ancho fijo (128px)
- Nombres de taller en una sola línea
- Filtros por subestado

### 🔄 **Actualizaciones Automáticas:**
- Cálculo de subestados en tiempo real
- Actualización cada 30 segundos
- Filtros dinámicos

## ⚡ **Comandos Rápidos:**

| Acción | Comando |
|--------|---------|
| **Iniciar producción** | `npm run start-production` |
| **Desarrollo** | `npm run dev` |
| **Solo servidor** | `npm run server` |
| **Solo cliente** | `npm run client` |
| **Construir cliente** | `npm run build` |
| **Instalar dependencias** | `npm run install-all` |

---

**✨ La aplicación está lista para producción con todas las funcionalidades implementadas.**





























