import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  ArrowLeft,
  Calendar,
  User,
  Building,
  DollarSign,
  FileText,
  AlertTriangle,
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  X,
  Paperclip,
  Upload,
  Download,
  Trash2,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  Loader
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { presupuestosAPI, formatError } from '../services/api';

const PresupuestoDetalle = () => {
  const { referencia } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [usuarioComentario, setUsuarioComentario] = useState('');
  const [comentarios, setComentarios] = useState([]);
  
  // Estados para el modal de cambio de estado
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [usuarioCambioEstado, setUsuarioCambioEstado] = useState('');
  const [comentarioAdicional, setComentarioAdicional] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  
  // Estado para la Ref. OR taller
  const [orSiniestro, setOrSiniestro] = useState('');
  
  // Estados para manejo de adjuntos
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [usuarioAdjunto, setUsuarioAdjunto] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Consulta para obtener los detalles del presupuesto
  const { data: presupuesto, isLoading, error } = useQuery(
    ['presupuesto', referencia],
    () => presupuestosAPI.getPresupuesto(referencia).then(res => res.data),
    {
      enabled: !!referencia,
      retry: false
    }
  );

  // Cargar Ref. OR taller desde la base de datos
  useEffect(() => {
    if (presupuesto && presupuesto.orSiniestro !== undefined) {
      setOrSiniestro(presupuesto.orSiniestro || '');
    }
  }, [presupuesto]);

  // Función para manejar el cambio de la Ref. OR taller
  const handleOrSiniestroChange = (value) => {
    setOrSiniestro(value);
    
    // Guardar automáticamente después de un breve delay
    if (value.length <= 15) {
      actualizarOrSiniestroMutation.mutate({
        orSiniestro: value,
        usuarioModificacion: 'Usuario' // Podrías obtener esto de un contexto de usuario
      });
    }
  };

  // Mutación para actualizar Ref. OR taller
  const actualizarOrSiniestroMutation = useMutation(
    ({ orSiniestro, usuarioModificacion }) => 
      presupuestosAPI.actualizarOrSiniestro(referencia, { orSiniestro, usuarioModificacion }),
    {
      onSuccess: () => {
        // Invalidar la consulta para refrescar los datos
        queryClient.invalidateQueries(['presupuesto', referencia]);
      },
      onError: (error) => {
        console.error('Error al actualizar Ref. OR taller:', error);
        alert('Error al guardar Ref. OR taller: ' + formatError(error));
      }
    }
  );

  // Mutación para cambiar el estado del presupuesto con auditoría
  const cambiarEstadoMutation = useMutation(
    ({ nuevoEstado, usuarioCambioEstado }) => 
      presupuestosAPI.cambiarEstado(referencia, { nuevoEstado, usuarioCambioEstado }),
    {
      onSuccess: () => {
        // Invalidar la caché para refrescar los datos
        queryClient.invalidateQueries(['presupuesto', referencia]);
        queryClient.invalidateQueries('presupuestos');
      },
      onError: (error) => {
        alert(`Error al cambiar el estado: ${formatError(error)}`);
      }
    }
  );

  // Cargar comentarios cuando se cargue el presupuesto
  React.useEffect(() => {
    if (presupuesto && presupuesto.comentarios) {
      setComentarios(presupuesto.comentarios);
    }
  }, [presupuesto]);

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Función para formatear fechas
  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
  };

  // Función para formatear fechas con hora (para comentarios)
  const formatDateTime = (dateString) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  // Función para calcular margen
  const calculateMargin = (importe, costo) => {
    if (!importe || importe === 0) return 0;
    const margin = ((importe - costo) / importe) * 100;
    return Math.round(margin);
  };

  // Función para calcular totales de las piezas
  const calculateTotals = () => {
    if (!presupuesto.piezas || presupuesto.piezas.length === 0) {
      return {
        costoTotal: presupuesto.costoCalculado || presupuesto.costo || 0,
        pvpTotal: presupuesto.pvpCalculado || presupuesto.pvp || 0,
        importeTotal: presupuesto.importe || 0
      };
    }

    const totals = presupuesto.piezas.reduce((acc, pieza) => {
      // Para aceites, usar valores totales calculados; para piezas normales, usar valores originales
      let costo, pvp, importe;
      
      if (pieza.esAceite && pieza.costoCalculado !== undefined && pieza.pvpCalculado !== undefined) {
        // Para aceites, usar valores totales calculados para costo y PVP, pero importe original
        costo = pieza.costoCalculado;
        pvp = pieza.pvpCalculado;
        importe = pieza.importe || 0;
      } else {
        // Para piezas normales, usar valores originales
        costo = pieza.costo || 0;
        pvp = pieza.pvp || 0;
        importe = pieza.importe || 0;
      }
      
      acc.costoTotal += costo;
      acc.pvpTotal += pvp;
      acc.importeTotal += importe;
      return acc;
    }, { costoTotal: 0, pvpTotal: 0, importeTotal: 0 });

    return totals;
  };

  // Función para agregar comentario
  const handleAgregarComentario = async () => {
    if (!nuevoComentario.trim() || !usuarioComentario.trim()) {
      alert('Por favor, completa tanto el usuario como el comentario');
      return;
    }
    
    try {
      const comentario = {
        texto: nuevoComentario.trim(),
        usuario: usuarioComentario.trim()
      };
      
      // Guardar comentario en la base de datos
      const response = await presupuestosAPI.agregarComentario(referencia, comentario);
      
      // Agregar comentario localmente (al final del array para mantener orden cronológico)
      setComentarios(prev => [...prev, response.data.comentario]);
      setNuevoComentario('');
      setUsuarioComentario('');
      
    } catch (error) {
      alert(`Error al agregar comentario: ${formatError(error)}`);
    }
  };

  // Función para manejar envío con Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAgregarComentario();
    }
  };

  // Función para cambiar el estado del presupuesto
  const handleCambiarEstado = (estado) => {
    setNuevoEstado(estado);
    setUsuarioCambioEstado('');
    setComentarioAdicional('');
    setMotivoRechazo('');
    setModalAbierto(true);
  };

  // Función para cerrar el modal y resetear campos
  const cerrarModal = () => {
    setModalAbierto(false);
    setNuevoEstado('');
    setUsuarioCambioEstado('');
    setMotivoRechazo('');
    setComentarioAdicional('');
  };

  const confirmarCambioEstado = () => {
    if (!usuarioCambioEstado.trim()) {
      alert('Por favor ingresa tu nombre de usuario');
      return;
    }

    // Si es rechazo, validar que haya motivo de rechazo y comentario adicional
    if (nuevoEstado === 'Rechazado') {
      if (!motivoRechazo) {
        alert('Por favor selecciona un motivo de rechazo');
        return;
      }
      if (!comentarioAdicional.trim()) {
        alert('Por favor ingresa un comentario explicando el motivo del rechazo');
        return;
      }
    }

    // Cambiar el estado del presupuesto con auditoría
    cambiarEstadoMutation.mutate({ nuevoEstado, usuarioCambioEstado }, {
      onSuccess: async () => {
        try {
          // Crear comentario automático
          let comentarioAutomatico = `Estado cambiado a "${nuevoEstado}" por ${usuarioCambioEstado}`;
          
          // Si es rechazo y hay motivo y comentario adicional, combinarlos
          if (nuevoEstado === 'Rechazado' && motivoRechazo && comentarioAdicional.trim()) {
            comentarioAutomatico += `\n\nMotivo: ${motivoRechazo}`;
            comentarioAutomatico += `\n\nDetalles: ${comentarioAdicional.trim()}`;
          }
          
          const comentario = {
            texto: comentarioAutomatico,
            usuario: usuarioCambioEstado
          };
          
          // Guardar comentario en la base de datos
          const response = await presupuestosAPI.agregarComentario(referencia, comentario);
          
          // Agregar comentario localmente (al final del array para mantener orden cronológico)
          setComentarios(prev => [...prev, response.data.comentario]);
          
          // Cerrar modal
          cerrarModal();
        } catch (error) {
          console.error('Error al agregar comentario automático:', error);
          // Cerrar modal aunque haya error
          cerrarModal();
        }
      }
    });
  };

  const cancelarCambioEstado = () => {
    cerrarModal();
  };

  // Función para obtener el color del estado
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'Abierto':
        return 'text-blue-400';
      case 'Aceptado':
        return 'text-green-400';
      case 'Rechazado':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  // Función para obtener el icono del estado
  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'Abierto':
        return <Clock className="w-5 h-5" />;
      case 'Aceptado':
        return <CheckCircle className="w-5 h-5" />;
      case 'Rechazado':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  // Funciones para manejo de archivos adjuntos
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamaño (50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('El archivo no puede superar 50MB');
        return;
      }
      setArchivoSeleccionado(file);
    }
  };

  const handleFileUpload = async () => {
    if (!archivoSeleccionado || !usuarioAdjunto.trim()) {
      alert('Por favor selecciona un archivo e ingresa tu nombre');
      return;
    }

    const formData = new FormData();
    formData.append('archivo', archivoSeleccionado);
    formData.append('usuario', usuarioAdjunto);

    try {
      setUploading(true);
      setUploadProgress(0);

      await presupuestosAPI.subirAdjunto(referencia, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      // Actualizar la lista de adjuntos del presupuesto
      queryClient.invalidateQueries(['presupuesto', referencia]);
      
      // Limpiar formulario
      setArchivoSeleccionado(null);
      setUsuarioAdjunto('');
      setUploadProgress(0);
      
      // Resetear el input file
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';

      alert('Archivo subido correctamente');
    } catch (error) {
      console.error('Error al subir archivo:', error);
      alert(`Error al subir archivo: ${formatError(error)}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileDownload = async (nombreArchivo, nombreOriginal) => {
    try {
      const response = await presupuestosAPI.descargarAdjunto(referencia, nombreArchivo);
      
      // Crear un enlace temporal para descargar
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nombreOriginal);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar archivo:', error);
      alert(`Error al descargar archivo: ${formatError(error)}`);
    }
  };

  const handleFileDelete = async (nombreArchivo, nombreOriginal) => {
    if (!window.confirm(`¿Estás seguro de eliminar el archivo "${nombreOriginal}"?`)) {
      return;
    }

    try {
      await presupuestosAPI.eliminarAdjunto(referencia, nombreArchivo);
      
      // Actualizar la lista de adjuntos del presupuesto
      queryClient.invalidateQueries(['presupuesto', referencia]);
      
      alert('Archivo eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      alert(`Error al eliminar archivo: ${formatError(error)}`);
    }
  };

  // Función para formatear tamaño de archivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Función para obtener icono según tipo de archivo
  const getFileIcon = (tipo) => {
    if (tipo.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-blue-400" />;
    } else if (tipo.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-400" />;
    } else if (tipo.includes('spreadsheet') || tipo.includes('excel')) {
      return <FileSpreadsheet className="w-5 h-5 text-green-400" />;
    } else if (tipo.includes('word') || tipo.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-400" />;
    } else {
      return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">
          <AlertTriangle className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Error al cargar el presupuesto
        </h3>
        <p className="text-slate-400">{formatError(error)}</p>
        <button
          onClick={() => navigate('/presupuestos')}
          className="btn-primary mt-4"
        >
          Volver a Presupuestos
        </button>
      </div>
    );
  }

  if (!presupuesto) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 mb-4">
          <FileText className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Presupuesto no encontrado
        </h3>
        <p className="text-slate-400">El presupuesto {referencia} no existe.</p>
        <button
          onClick={() => navigate('/presupuestos')}
          className="btn-primary mt-4"
        >
          Volver a Presupuestos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/presupuestos')}
            className="btn-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">
              Presupuesto {presupuesto.referencia}
            </h1>
            <p className="text-slate-400 mt-1">
              Detalles completos del presupuesto
            </p>
          </div>
        </div>
                 <div className="flex items-center space-x-3">
           <div className="text-sm text-slate-400">
             Estado: <span className={`font-semibold ${getEstadoColor(presupuesto.estado || 'Abierto')}`}>
               {presupuesto.estado || 'Abierto'}
             </span>
           </div>
         </div>
      </div>



      {/* Información General */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información del Cliente */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Información del Cliente
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-400">Cliente</label>
              <p className="text-white">{presupuesto.nombre}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400">CTA</label>
              <p className="text-white font-mono">{presupuesto.cta}</p>
            </div>
          </div>
        </div>

        {/* Información del Siniestro */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Información del Siniestro
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-400">Fecha de Creación</label>
                <p className="text-white flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {formatDate(presupuesto.auditoria?.fechaCreacion || presupuesto.fechaCarga)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Taller</label>
                <p className="text-white flex items-center">
                  <Building className="w-4 h-4 mr-2" />
                  {presupuesto.nombreTaller || presupuesto.taller}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Descripción</label>
                <p className="text-white">{presupuesto.descripcionSiniestro}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Ref. OR taller</label>
                <input
                  type="text"
                  value={orSiniestro}
                  onChange={(e) => handleOrSiniestroChange(e.target.value)}
                  placeholder={presupuesto.estado === 'Aceptado' ? 'OR...' : 'No disponible'}
                  disabled={presupuesto.estado !== 'Aceptado'}
                  maxLength={15}
                  className={`w-full px-3 py-1.5 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium ${
                    presupuesto.estado === 'Aceptado' 
                      ? 'border-slate-600 hover:border-slate-500' 
                      : 'border-slate-700 bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen Financiero */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(() => {
            const totals = calculateTotals();
            return (
              <>
                <div className="text-center p-4 bg-slate-800 rounded-lg">
                  <label className="text-sm font-medium text-slate-400">Costo Total</label>
                  <p className="text-red-400 text-xl font-bold">
                    {formatCurrency(totals.costoTotal)}
                  </p>
                </div>
                <div className="text-center p-4 bg-slate-800 rounded-lg">
                  <label className="text-sm font-medium text-slate-400">PVP Total</label>
                  <p className="text-yellow-400 text-xl font-bold">
                    {formatCurrency(totals.pvpTotal)}
                  </p>
                </div>
                <div className="text-center p-4 bg-slate-800 rounded-lg">
                  <label className="text-sm font-medium text-slate-400">Importe Total</label>
                  <p className="text-green-400 text-xl font-bold">
                    {formatCurrency(totals.importeTotal)}
                  </p>
                </div>
                <div className="text-center p-4 bg-slate-800 rounded-lg">
                  <label className="text-sm font-medium text-slate-400">Margen</label>
                  <p className="text-blue-400 text-xl font-bold">
                    {calculateMargin(totals.importeTotal, totals.costoTotal)}%
                  </p>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Lista de Piezas */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">
          Piezas ({presupuesto.piezas?.length || 0})
        </h3>
        {presupuesto.piezas && presupuesto.piezas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Pieza</th>
                  <th>Concepto</th>
                  <th>Cantidad</th>
                  <th>Costo</th>
                  <th>PVP</th>
                  <th>Importe</th>
                  <th>Margen</th>
                </tr>
              </thead>
              <tbody>
                {presupuesto.piezas.map((pieza, index) => {
                  // Para aceites, mostrar valores por unidad; para piezas normales, usar valores originales
                  let costo, pvp, importe;
                  
                  if (pieza.esAceite && pieza.costoCalculado !== undefined && pieza.pvpCalculado !== undefined) {
                    // Para aceites, mostrar valores por litro (ya calculados por el backend)
                    costo = pieza.costoCalculado / pieza.cantidad; // Dividir por cantidad para mostrar por litro
                    pvp = pieza.pvpCalculado / pieza.cantidad; // Dividir por cantidad para mostrar por litro
                    importe = pieza.importe || 0; // Importe original de la base de datos
                  } else {
                    // Para piezas normales, usar valores originales
                    costo = pieza.costo || 0;
                    pvp = pieza.pvp || 0;
                    importe = pieza.importe || 0;
                  }
                  
                  return (
                    <tr key={index}>
                      <td className="font-medium text-white">{pieza.pieza}</td>
                      <td className="text-slate-300">
                        {pieza.concepto}
                        {pieza.esAceite && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-600 text-blue-100">
                            ACEITE
                          </span>
                        )}
                      </td>
                      <td className="text-center text-slate-300">{pieza.cantidad || 1}</td>
                      <td className="text-red-400">{formatCurrency(costo)}</td>
                      <td className="text-yellow-400">{formatCurrency(pvp)}</td>
                      <td className="text-green-400 font-medium">{formatCurrency(importe)}</td>
                      <td className="text-blue-400">
                        {pieza.esAceite && pieza.costoCalculado !== undefined
                          ? calculateMargin(importe, pieza.costoCalculado)
                          : calculateMargin(importe, costo)
                        }%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay piezas registradas</p>
          </div>
        )}
      </div>

             {/* Información de Auditoría y Estado del Presupuesto */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Información de Auditoría */}
         <div className="card">
           <h3 className="text-lg font-semibold text-white mb-4">
             Información de Auditoría
           </h3>
           <div className="h-32 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
             {/* Información de creación */}
             <div className="border-b border-slate-600 pb-2">
               <h4 className="text-sm font-medium text-blue-400 mb-1">Creación</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                 <div>
                   <label className="text-xs text-slate-400">Creado por</label>
                   <p className="text-white font-medium">{presupuesto.auditoria?.creadoPor || presupuesto.usuario || 'N/A'}</p>
                 </div>
                 <div>
                   <label className="text-xs text-slate-400">Fecha de creación</label>
                   <p className="text-white">{formatDateTime(presupuesto.auditoria?.fechaCreacion || presupuesto.fechaCarga)}</p>
                 </div>
               </div>
             </div>

             {/* Información de modificación */}
             {presupuesto.auditoria?.modificadoPor && (
               <div className="border-b border-slate-600 pb-2">
                 <h4 className="text-sm font-medium text-yellow-400 mb-1">Última Modificación</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                   <div>
                     <label className="text-xs text-slate-400">Modificado por</label>
                     <p className="text-white font-medium">{presupuesto.auditoria.modificadoPor}</p>
                   </div>
                   <div>
                     <label className="text-xs text-slate-400">Fecha de modificación</label>
                     <p className="text-white">{formatDateTime(presupuesto.auditoria.fechaModificacion)}</p>
                   </div>
                 </div>
               </div>
             )}

             {/* Información de cambio de estado */}
             {presupuesto.auditoria?.estadoCambiadoPor && (
               <div>
                 <h4 className="text-sm font-medium text-green-400 mb-1">Cambio de Estado</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                   <div>
                     <label className="text-xs text-slate-400">Estado cambiado por</label>
                     <p className="text-white font-medium">{presupuesto.auditoria.estadoCambiadoPor}</p>
                   </div>
                   <div>
                     <label className="text-xs text-slate-400">Fecha de cambio</label>
                     <p className="text-white">{formatDateTime(presupuesto.auditoria.fechaCambioEstado)}</p>
                   </div>
                 </div>
                 {presupuesto.auditoria.estadoAnterior && (
                   <div className="mt-1">
                     <label className="text-xs text-slate-400">Estado anterior</label>
                     <p className="text-white">{presupuesto.auditoria.estadoAnterior} → {presupuesto.estado}</p>
                   </div>
                 )}
               </div>
             )}

             {/* Información básica si no hay auditoría completa */}
             {!presupuesto.auditoria && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium text-slate-400">Fecha de Carga</label>
                   <p className="text-white">{formatDate(presupuesto.fechaCarga)}</p>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-slate-400">Última Actualización</label>
                   <p className="text-white">{formatDate(presupuesto.ultimaActualizacion)}</p>
                 </div>
               </div>
             )}
           </div>
         </div>

         {/* Estado del Presupuesto */}
         <div className="card">
           <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
             Estado del Presupuesto
           </h3>
           <div className="space-y-4">
             <div className="flex items-center space-x-3">
               <div className={`text-2xl font-bold ${getEstadoColor(presupuesto.estado || 'Abierto')}`}>
                 {getEstadoIcon(presupuesto.estado || 'Abierto')}
               </div>
               <div>
                 <p className={`text-xl font-semibold ${getEstadoColor(presupuesto.estado || 'Abierto')}`}>
                   {presupuesto.estado || 'Abierto'}
                 </p>
                 <p className="text-sm text-slate-400">
                   Estado actual del presupuesto
                 </p>
               </div>
             </div>
             
                           <div className="flex justify-center p-4">
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleCambiarEstado('Aceptado')}
                    disabled={cambiarEstadoMutation.isLoading || presupuesto.estado === 'Aceptado'}
                    className={`px-6 py-2 min-w-[120px] flex items-center justify-center rounded-lg font-medium transition-all duration-200 ${
                      presupuesto.estado === 'Aceptado'
                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aceptar
                  </button>
                  <button
                    onClick={() => handleCambiarEstado('Rechazado')}
                    disabled={cambiarEstadoMutation.isLoading || presupuesto.estado === 'Rechazado'}
                    className={`px-6 py-2 min-w-[120px] flex items-center justify-center rounded-lg font-medium transition-all duration-200 ${
                      presupuesto.estado === 'Rechazado'
                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleCambiarEstado('Abierto')}
                    disabled={cambiarEstadoMutation.isLoading || presupuesto.estado === 'Abierto'}
                    className={`px-6 py-2 min-w-[120px] flex items-center justify-center rounded-lg font-medium transition-all duration-200 ${
                      presupuesto.estado === 'Abierto'
                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Reabrir
                  </button>
                </div>
              </div>
           </div>
         </div>
       </div>

       {/* Sección de Comentarios */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Formulario para agregar comentario */}
         <div className="card">
           <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
             <MessageSquare className="w-5 h-5 mr-2" />
             Agregar Comentario
           </h3>
           
           <div className="space-y-4">
             {/* Campo de usuario */}
             <div>
               <label className="block text-sm font-medium text-slate-300 mb-2">
                 Usuario
               </label>
               <input
                 type="text"
                 value={usuarioComentario}
                 onChange={(e) => setUsuarioComentario(e.target.value)}
                 placeholder="Ingresa tu nombre..."
                 className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
               />
             </div>
            
            {/* Campo de comentario */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Comentario
              </label>
              <div className="flex space-x-3">
                <div className="flex-1">
                  <textarea
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe un comentario..."
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:border-blue-500"
                    rows="3"
                  />
                </div>
                <button
                  onClick={handleAgregarComentario}
                  disabled={!nuevoComentario.trim() || !usuarioComentario.trim()}
                  className="btn-primary self-end disabled:opacity-50 disabled:cursor-not-allowed px-4"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
         </div>

         {/* Lista de comentarios */}
         <div className="card">
           <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
             <MessageSquare className="w-5 h-5 mr-2" />
             Comentarios ({comentarios.length})
           </h3>
           
           <div className="space-y-4">
             {comentarios.length > 0 ? (
               comentarios.slice().reverse().map((comentario) => (
                 <div key={comentario.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                   <div className="flex items-start justify-between mb-2">
                     <div className="flex items-center space-x-2">
                       <span className="text-sm font-medium text-blue-400">
                         {comentario.usuario}
                       </span>
                       <span className="text-xs text-slate-400">
                         {formatDateTime(comentario.fecha)}
                       </span>
                     </div>
                   </div>
                   <p className="text-white text-sm leading-relaxed">
                     {comentario.texto}
                   </p>
                 </div>
               ))
             ) : (
               <div className="text-center py-8 text-slate-400">
                 <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                 <p>No hay comentarios aún</p>
                 <p className="text-sm mt-1">Sé el primero en agregar un comentario</p>
               </div>
             )}
           </div>
         </div>
       </div>

       {/* Sección de Archivos Adjuntos */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Formulario para subir archivo */}
         <div className="card">
           <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
             <Upload className="w-5 h-5 mr-2" />
             Subir Archivo Adjunto
           </h3>
           
           <div className="space-y-4">
             {/* Campo de usuario */}
             <div>
               <label className="block text-sm font-medium text-slate-300 mb-2">
                 Usuario
               </label>
               <input
                 type="text"
                 value={usuarioAdjunto}
                 onChange={(e) => setUsuarioAdjunto(e.target.value)}
                 placeholder="Ingresa tu nombre..."
                 className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                 disabled={uploading}
               />
             </div>
            
            {/* Campo de archivo */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Archivo (máx. 50MB)
              </label>
              <input
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                disabled={uploading}
              />
              {archivoSeleccionado && (
                <p className="text-xs text-slate-400 mt-2">
                  Archivo seleccionado: {archivoSeleccionado.name} ({formatFileSize(archivoSeleccionado.size)})
                </p>
              )}
            </div>

            {/* Barra de progreso */}
            {uploading && (
              <div className="space-y-2">
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-center text-slate-400">
                  Subiendo... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Botón de subir */}
            <button
              onClick={handleFileUpload}
              disabled={!archivoSeleccionado || !usuarioAdjunto.trim() || uploading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {uploading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Subir Archivo</span>
                </>
              )}
            </button>
          </div>
         </div>

         {/* Lista de archivos adjuntos */}
         <div className="card">
           <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
             <Paperclip className="w-5 h-5 mr-2" />
             Archivos Adjuntos ({presupuesto?.adjuntos?.length || 0})
           </h3>
           
           <div className="space-y-3">
             {presupuesto?.adjuntos && presupuesto.adjuntos.length > 0 ? (
               presupuesto.adjuntos.slice().reverse().map((adjunto, index) => (
                 <div key={index} className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
                   <div className="flex items-start justify-between">
                     <div className="flex items-start space-x-3 flex-1">
                       {/* Icono de tipo de archivo */}
                       <div className="mt-1">
                         {getFileIcon(adjunto.tipo)}
                       </div>
                       
                       {/* Información del archivo */}
                       <div className="flex-1 min-w-0">
                         <p className="text-white text-sm font-medium truncate">
                           {adjunto.nombreOriginal}
                         </p>
                         <div className="flex items-center space-x-3 mt-1">
                           <span className="text-xs text-slate-400">
                             {formatFileSize(adjunto.tamanio)}
                           </span>
                           <span className="text-xs text-slate-400">
                             {formatDateTime(adjunto.fechaSubida)}
                           </span>
                           <span className="text-xs text-blue-400">
                             {adjunto.usuario}
                           </span>
                         </div>
                       </div>
                     </div>
                     
                     {/* Botones de acción */}
                     <div className="flex items-center space-x-2 ml-2">
                       <button
                         onClick={() => handleFileDownload(adjunto.nombreArchivo, adjunto.nombreOriginal)}
                         className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                         title="Descargar archivo"
                       >
                         <Download className="w-4 h-4" />
                       </button>
                       <button
                         onClick={() => handleFileDelete(adjunto.nombreArchivo, adjunto.nombreOriginal)}
                         className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                         title="Eliminar archivo"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-8 text-slate-400">
                 <Paperclip className="w-12 h-12 mx-auto mb-4 opacity-50" />
                 <p>No hay archivos adjuntos</p>
                 <p className="text-sm mt-1">Sube el primer archivo usando el formulario</p>
               </div>
             )}
           </div>
         </div>
       </div>

       {/* Modal para cambio de estado */}
       {modalAbierto && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4 border border-slate-600">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-semibold text-white">
                 Cambiar Estado del Presupuesto
               </h3>
               <button
                 onClick={cancelarCambioEstado}
                 className="text-slate-400 hover:text-white transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <p className="text-slate-300 mb-2">
                   ¿Estás seguro de que quieres cambiar el estado a <span className="font-semibold text-white">"{nuevoEstado}"</span>?
                 </p>
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-slate-300 mb-2">
                   Usuario *
                 </label>
                 <input
                   type="text"
                   value={usuarioCambioEstado}
                   onChange={(e) => setUsuarioCambioEstado(e.target.value)}
                   placeholder="Ingresa tu nombre de usuario..."
                   className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   autoFocus
                 />
               </div>

               {/* Campos adicionales solo para rechazo */}
               {nuevoEstado === 'Rechazado' && (
                 <>
                   {/* Desplegable de motivo de rechazo */}
                   <div>
                     <label className="block text-sm font-medium text-slate-300 mb-2">
                       Motivo del rechazo *
                     </label>
                     <select
                       value={motivoRechazo}
                       onChange={(e) => setMotivoRechazo(e.target.value)}
                       className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       required
                     >
                       <option value="">Selecciona un motivo...</option>
                       <option value="No responde">No responde</option>
                       <option value="Precio elevado">Precio elevado</option>
                       <option value="Tiempo de demora">Tiempo de demora</option>
                     </select>
                   </div>

                   {/* Campo de comentario adicional */}
                   <div>
                     <label className="block text-sm font-medium text-slate-300 mb-2">
                       Detalles del rechazo *
                     </label>
                     <textarea
                       value={comentarioAdicional}
                       onChange={(e) => setComentarioAdicional(e.target.value)}
                       placeholder="Explica los detalles del rechazo..."
                       rows={3}
                       className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                     />
                   </div>
                 </>
               )}
               
               <div className="flex space-x-3 pt-4">
                 <button
                   onClick={cancelarCambioEstado}
                   className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                 >
                   Cancelar
                 </button>
                 <button
                   onClick={confirmarCambioEstado}
                   disabled={cambiarEstadoMutation.isLoading || !usuarioCambioEstado.trim() || (nuevoEstado === 'Rechazado' && (!motivoRechazo || !comentarioAdicional.trim()))}
                   className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {cambiarEstadoMutation.isLoading ? 'Procesando...' : 'Confirmar'}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };

export default PresupuestoDetalle;
