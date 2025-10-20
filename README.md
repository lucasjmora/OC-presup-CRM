# OC Presup CRM

Sistema CRM para el seguimiento de presupuestos de reparación mecánica y siniestros automotores. Permite cargar datos desde archivos Excel a una base de datos MongoDB con validación de duplicados y seguimiento completo.

## 🚀 Características

- **Dashboard interactivo** con estadísticas y gráficos
- **Gestión de presupuestos** con filtros avanzados y paginación
- **Carga de archivos Excel** con validación automática
- **Configuración flexible** de base de datos y archivos
- **Interfaz moderna** en modo dark
- **Validación de duplicados** por campo referencia
- **Estadísticas en tiempo real**

## 🛠️ Tecnologías

### Backend
- **Node.js** con Express
- **MongoDB** con Mongoose
- **XLSX** para procesamiento de archivos Excel
- **CORS** y **Helmet** para seguridad

### Frontend
- **React** con hooks
- **React Query** para gestión de estado
- **Tailwind CSS** para estilos
- **Recharts** para gráficos
- **Lucide React** para iconos
- **React Router** para navegación

## 📋 Requisitos Previos

- **Node.js** (versión 16 o superior)
- **MongoDB** (local o en la nube)
- **npm** o **yarn**

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd oc-presup-crm
```

### 2. Instalar dependencias

#### Opción A: Instalación automática (recomendada)
```bash
# Instalar todas las dependencias de una vez
npm run install-all
```

#### Opción B: Instalación manual
```bash
# Instalar dependencias del proyecto principal
npm install

# Instalar dependencias del servidor
cd server
npm install

# Instalar dependencias del cliente
cd ../client
npm install

# Volver al directorio raíz
cd ..
```

#### ⚠️ Nota importante para usuarios de OneDrive
Si tienes problemas con OneDrive y nombres de archivos incompatibles en `node_modules`:

1. **Ejecutar el script de limpieza**:
   ```bash
   # En Windows
   clean-node-modules.bat
   
   # O manualmente
   npm run clean-and-install
   ```

2. **Configurar OneDrive** para excluir `node_modules`:
   - Crear archivo `.onedriveignore` (ya incluido)
   - O configurar OneDrive para no sincronizar carpetas `node_modules`

### 3. Configurar variables de entorno (opcional)
Crear archivo `.env` en el directorio `server/`:
```env
PORT=5000
NODE_ENV=development
```

### 4. Iniciar la aplicación
```bash
# Iniciar servidor y cliente en modo desarrollo
npm run dev

# O iniciar por separado:
# Terminal 1 - Servidor
npm run server

# Terminal 2 - Cliente
npm run client
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000

## ⚙️ Configuración Inicial

### 1. Configurar Base de Datos
1. Ir a la sección **Configuración**
2. Completar los campos de MongoDB:
   - **URI**: `mongodb://localhost:27017` (o tu conexión)
   - **Database**: `oc_presup_crm`
   - **Collection**: `presupuestos`
3. Hacer clic en **Probar Conexión**
4. Guardar configuración

### 2. Configurar Archivo Excel
1. En la misma sección de **Configuración**
2. Especificar la ruta del archivo Excel
3. Opcionalmente, especificar el nombre de la hoja
4. Hacer clic en **Probar Excel**
5. Guardar configuración

## 📊 Estructura del Archivo Excel

El archivo Excel debe contener las siguientes columnas:

| Columna | Descripción | Requerido |
|---------|-------------|-----------|
| Referencia | Número único del presupuesto | ✅ |
| Fecha | Fecha del presupuesto | ✅ |
| CTA | Número de cuenta | ✅ |
| NOMBRE | Nombre del cliente | ✅ |
| Taller | Identificador del taller | ✅ |
| Pieza | Código de la pieza | ✅ |
| Concepto | Descripción del trabajo | ✅ |
| COSTO | Costo unitario | ✅ |
| PVP | Precio de venta | ✅ |
| Importe | Importe total | ✅ |
| Usuario | Usuario que procesó | ✅ |
| Descripcion siniestro | Tipo de trabajo | ✅ |

## 🔧 Uso del Sistema

### Dashboard
- **Vista general** de estadísticas
- **Gráficos** de presupuestos por tipo
- **Presupuestos recientes**

### Presupuestos
- **Lista completa** con paginación
- **Filtros avanzados** por fecha, tipo, taller
- **Búsqueda** por referencia, cliente, concepto
- **Ordenamiento** por columnas
- **Acciones** de ver y eliminar

### Carga Excel
- **Carga manual** especificando ruta
- **Carga automática** desde configuración
- **Validación** de estructura del archivo
- **Reporte detallado** de resultados
- **Manejo de duplicados** automático

### Configuración
- **Configuración de MongoDB**
- **Configuración de archivo Excel**
- **Pruebas de conexión**
- **Validación de archivos**

## 📁 Estructura del Proyecto

```
oc-presup-crm/
├── server/                 # Backend Node.js
│   ├── config/            # Configuración de base de datos
│   ├── models/            # Modelos de Mongoose
│   ├── routes/            # Rutas de la API
│   ├── data/              # Datos de configuración
│   └── index.js           # Servidor principal
├── client/                # Frontend React
│   ├── public/            # Archivos públicos
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas principales
│   │   ├── services/      # Servicios de API
│   │   └── index.js       # Punto de entrada
│   └── package.json
├── package.json           # Scripts principales
└── README.md
```

## 🔒 Seguridad

- **Validación** de entrada en servidor
- **Sanitización** de datos
- **Headers de seguridad** con Helmet
- **CORS** configurado
- **Validación** de archivos Excel

## 🚨 Manejo de Errores

- **Validación** de estructura de archivos
- **Manejo de duplicados** automático
- **Reportes detallados** de errores
- **Logs** en consola del servidor
- **Mensajes de error** amigables

## 📈 Rendimiento

- **Paginación** en listas grandes
- **Índices** en MongoDB para consultas rápidas
- **Caché** con React Query
- **Lazy loading** de componentes
- **Optimización** de consultas

## 🛠️ Desarrollo

### Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor y cliente
npm run server       # Solo servidor
npm run client       # Solo cliente

# Producción
npm run build        # Construye cliente
npm start           # Inicia servidor en producción

# Instalación
npm run install-all  # Instala todas las dependencias
```

### Estructura de la Base de Datos

```javascript
// Modelo Presupuesto
{
  referencia: String,           // Único, índice
  fecha: Date,
  cta: String,
  nombre: String,
  taller: String,
  pieza: String,
  concepto: String,
  costo: Number,
  pvp: Number,
  importe: Number,
  usuario: String,
  descripcionSiniestro: String,
  fechaCarga: Date,
  ultimaActualizacion: Date
}
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:
- Crear un issue en el repositorio
- Contactar al equipo de desarrollo

## 🔄 Actualizaciones

El sistema está diseñado para actualizaciones periódicas:
- **Carga incremental** de archivos Excel
- **Validación de duplicados** automática
- **Mantenimiento** de integridad de datos
- **Backup** automático de configuración

---

**OC Presup CRM** - Sistema de gestión de presupuestos automotores
