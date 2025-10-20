<!-- 6773c7ad-10fd-4b1b-8a2c-11af65018cf3 40357655-757f-470e-b4cd-1be4b0b49d9e -->
# Implementar Adjuntos de Archivos en Presupuestos

## 1. Backend - Modelo y Configuración

### Actualizar modelo Presupuesto

**Archivo:** `server/models/Presupuesto.js`

Agregar campo `adjuntos` al schema:

```javascript
adjuntos: [{
  nombreOriginal: String,
  nombreArchivo: String,  // nombre único en disco
  tamanio: Number,
  tipo: String,
  fechaSubida: { type: Date, default: Date.now },
  usuario: String
}]
```

### Actualizar configuración general

**Archivo:** `server/utils/configuracionGeneral.js`

Agregar campo `directorioAdjuntos` con valor por defecto:

```javascript
directorioAdjuntos: config.directorioAdjuntos || 'server/uploads/adjuntos'
```

## 2. Backend - Rutas de Archivos

### Crear endpoint de subida

**Archivo:** `server/routes/presupuestos.js`

Agregar ruta POST `/api/presupuestos/:referencia/adjuntos`:

- Usar `multer` (ya instalado) con límite de 50MB
- Validar que el presupuesto existe
- Generar nombre único con UUID + extensión original
- Guardar archivo en directorio parametrizado
- Actualizar array `adjuntos` del presupuesto
- Retornar info del archivo subido

### Crear endpoint de descarga

**Archivo:** `server/routes/presupuestos.js`

Agregar ruta GET `/api/presupuestos/:referencia/adjuntos/:nombreArchivo`:

- Validar permisos
- Servir archivo desde directorio parametrizado usando `res.sendFile()`

### Crear endpoint de eliminación

**Archivo:** `server/routes/presupuestos.js`

Agregar ruta DELETE `/api/presupuestos/:referencia/adjuntos/:nombreArchivo`:

- Validar que el presupuesto existe
- Eliminar archivo físico del disco
- Eliminar entrada del array `adjuntos`

## 3. Frontend - Configuración General

### Actualizar formulario de configuración

**Archivo:** `client/src/pages/ConfiguracionGeneral.js`

Agregar campo de texto para `directorioAdjuntos`:

```javascript
<input
  type="text"
  value={config.directorioAdjuntos || ''}
  onChange={(e) => setConfig({...config, directorioAdjuntos: e.target.value})}
  placeholder="server/uploads/adjuntos"
/>
```

## 4. Frontend - Detalle de Presupuesto

### Agregar sección de adjuntos

**Archivo:** `client/src/pages/PresupuestoDetalle.js`

Crear nueva sección "Archivos Adjuntos" que incluya:

- Input file con botón "Subir Archivo" (acepta cualquier tipo)
- Barra de progreso durante la subida
- Lista de archivos adjuntos con:
  - Icono según tipo de archivo
  - Nombre original
  - Tamaño formateado
  - Fecha de subida
  - Botón de descarga
  - Botón de eliminación (con confirmación)

### Implementar funciones de manejo

- `handleFileUpload`: usar FormData + axios con `onUploadProgress`
- `handleFileDownload`: crear link temporal para descarga
- `handleFileDelete`: confirmar y llamar API de eliminación

## 5. Frontend - Listado de Presupuestos

### Agregar indicador de adjuntos

**Archivo:** `client/src/pages/Presupuestos.js`

En la tabla, agregar columna o icono que muestre:

- Icono de clip (📎) si `presupuesto.adjuntos?.length > 0`
- Badge con número de archivos adjuntos
- Tooltip con lista de nombres al hover

## 6. Backend - Utilidades

### Crear directorio si no existe

**Archivo:** `server/routes/presupuestos.js`

Al iniciar el servidor, verificar/crear el directorio de adjuntos:

```javascript
const fs = require('fs');
const path = require('path');

// Asegurar que existe el directorio
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};
```

## Archivos a modificar:

- `server/models/Presupuesto.js` - agregar campo adjuntos
- `server/routes/presupuestos.js` - agregar 3 endpoints nuevos
- `server/utils/configuracionGeneral.js` - agregar parámetro
- `client/src/pages/ConfiguracionGeneral.js` - campo directorio
- `client/src/pages/PresupuestoDetalle.js` - sección de adjuntos
- `client/src/pages/Presupuestos.js` - indicador en listado

### To-dos

- [ ] Actualizar modelo Presupuesto con campo adjuntos
- [ ] Agregar directorioAdjuntos a configuración general
- [ ] Crear endpoints para subir, descargar y eliminar archivos
- [ ] Agregar campo de configuración de directorio en UI
- [ ] Implementar sección de adjuntos en detalle de presupuesto
- [ ] Agregar indicador de adjuntos en listado