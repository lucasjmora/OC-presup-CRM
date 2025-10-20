import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LabelList
} from 'recharts';

import { 
  DollarSign, 
  FileText,
  Calendar,
  Filter,
  ChevronDown,
  FileSpreadsheet,
  Image
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import { talleresAPI } from '../services/api';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

const Dashboard = () => {
  // Función para obtener el primer día del mes actual
  const getPrimerDiaMes = () => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  };

  // Función para obtener el último día del mes actual
  const getUltimoDiaMes = () => {
    const hoy = new Date();
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    return ultimoDia.toISOString().split('T')[0];
  };

  // Función para obtener fecha de hace 45 días
  const getUltimos45Dias = () => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 45);
    return fecha.toISOString().split('T')[0];
  };

  // Función para obtener fecha de hoy
  const getHoy = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Estado para filtros de fecha - por defecto últimos 45 días
  const [fechaDesde, setFechaDesde] = useState(getUltimos45Dias());
  const [fechaHasta, setFechaHasta] = useState(getHoy());
  const [filtrosActivos, setFiltrosActivos] = useState(true);

  // Función para construir query string con filtros
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (fechaDesde) params.append('fechaDesde', fechaDesde);
    if (fechaHasta) params.append('fechaHasta', fechaHasta);
    return params.toString();
  };

  // Consultas para obtener datos con filtros
  const { data: estadisticas, isLoading: loadingStats } = useQuery(
    ['estadisticas', fechaDesde, fechaHasta],
    () => {
      const queryString = buildQueryString();
      return api.get(`/api/presupuestos/stats/estadisticas?${queryString}`).then(res => res.data);
    },
    { 
      refetchInterval: 30000, // Actualizar cada 30 segundos
      enabled: !!fechaDesde && !!fechaHasta, // Solo ejecutar cuando hay fechas
      refetchOnWindowFocus: true // Refrescar al volver a la ventana
    }
  );

  const { data: estadisticasPorTaller, isLoading: loadingTalleres } = useQuery(
    ['estadisticasPorTaller', fechaDesde, fechaHasta],
    () => {
      const queryString = buildQueryString();
      return api.get(`/api/presupuestos/stats/por-taller?${queryString}`).then(res => res.data);
    },
    { 
      refetchInterval: 30000,
      enabled: !!fechaDesde && !!fechaHasta, // Solo ejecutar cuando hay fechas
      refetchOnWindowFocus: true // Refrescar al volver a la ventana
    }
  );

  const { data: abiertosPendientesData, isLoading: loadingAbiertosPendientes } = useQuery(
    ['abiertosPendientesPorTaller', fechaDesde, fechaHasta],
    () => {
      const queryString = buildQueryString();
      return api.get(`/api/presupuestos/stats/abiertos-pendientes-por-taller?${queryString}`).then(res => res.data);
    },
    { 
      refetchInterval: 30000,
      enabled: !!fechaDesde && !!fechaHasta, // Solo ejecutar cuando hay fechas
      refetchOnWindowFocus: true // Refrescar al volver a la ventana
    }
  );

  // Extraer datos de la nueva estructura
  const abiertosPendientesPorTaller = abiertosPendientesData?.talleres || [];
  const totalesAbiertosPendientes = abiertosPendientesData?.totales || { cantidad: 0, importe: 0 };

  const { data: aceptadosData, isLoading: loadingAceptados } = useQuery(
    ['aceptadosPorTaller', fechaDesde, fechaHasta],
    () => {
      const queryString = buildQueryString();
      return api.get(`/api/presupuestos/stats/aceptados-por-taller?${queryString}`).then(res => res.data);
    },
    { 
      refetchInterval: 30000,
      enabled: !!fechaDesde && !!fechaHasta, // Solo ejecutar cuando hay fechas
      refetchOnWindowFocus: true // Refrescar al volver a la ventana
    }
  );

  // Extraer datos de presupuestos aceptados
  const aceptadosPorTaller = aceptadosData?.talleres || [];
  const totalesAceptados = aceptadosData?.totales || { cantidad: 0, importe: 0 };

  const { data: rechazadosData, isLoading: loadingRechazados } = useQuery(
    ['rechazadosPorTaller', fechaDesde, fechaHasta],
    () => {
      const queryString = buildQueryString();
      return api.get(`/api/presupuestos/stats/rechazados-por-taller?${queryString}`).then(res => res.data);
    },
    { 
      refetchInterval: 30000,
      enabled: !!fechaDesde && !!fechaHasta, // Solo ejecutar cuando hay fechas
      refetchOnWindowFocus: true // Refrescar al volver a la ventana
    }
  );

  // Extraer datos de presupuestos rechazados
  const rechazadosPorTaller = rechazadosData?.talleres || [];
  const totalesRechazados = rechazadosData?.totales || { cantidad: 0, importe: 0 };

  const { data: conversionData, isLoading: loadingConversion } = useQuery(
    ['conversionPorTaller', fechaDesde, fechaHasta],
    () => {
      const queryString = buildQueryString();
      return api.get(`/api/presupuestos/stats/conversion-por-taller?${queryString}`).then(res => res.data);
    },
    { 
      refetchInterval: 30000,
      enabled: !!fechaDesde && !!fechaHasta, // Solo ejecutar cuando hay fechas
      refetchOnWindowFocus: true // Refrescar al volver a la ventana
    }
  );

  // Extraer datos de conversión
  const conversionPorTaller = conversionData?.talleres || [];
  const totalesConversion = conversionData?.totales || { total: 0, aceptados: 0, conversion: 0, importeTotal: 0, importeAceptados: 0 };

  // Consulta para obtener el conteo de presupuestos aceptados con ORs desde el backend
  const { data: conteoORsData, isLoading: loadingConteoORs } = useQuery(
    ['conteoPresupuestosConORs', fechaDesde, fechaHasta],
    () => {
      const queryString = buildQueryString();
      return api.get(`/api/presupuestos/stats/aceptados-con-ors?${queryString}`).then(res => res.data);
    },
    { 
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      staleTime: 0, // Asegurar que siempre se ejecute en mount
      cacheTime: 0, // No mantener datos en caché
      refetchOnMount: 'always' // Siempre refrescar al montar
    }
  );

  // Consulta para obtener el conteo de ORs por taller
  const { data: orsPorTallerData, isLoading: loadingOrsPorTaller } = useQuery(
    ['orsPorTaller', fechaDesde, fechaHasta],
    () => {
      const queryString = buildQueryString();
      return api.get(`/api/presupuestos/stats/ors-por-taller?${queryString}`).then(res => res.data);
    },
    { 
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      staleTime: 0,
      cacheTime: 0,
      refetchOnMount: 'always'
    }
  );

  // Obtener el conteo desde la respuesta del backend
  const conteoPresupuestosConORs = conteoORsData?.totalConORs || 0;
  const orsPorTaller = orsPorTallerData?.orsPorTaller || {};

  // Consulta para obtener estadísticas mensuales por taller
  const { data: datosMensuales, isLoading: loadingMensuales } = useQuery(
    'estadisticasMensualesPorTaller',
    () => api.get('/api/presupuestos/stats/mensuales-por-taller').then(res => res.data),
    { 
      refetchInterval: 60000, // Actualizar cada minuto
      refetchOnWindowFocus: true
    }
  );

  // Consulta para obtener talleres
  const { data: talleres } = useQuery(
    'talleres',
    () => talleresAPI.getTalleres().then(res => res.data),
    { 
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchInterval: 60000, // Actualizar cada minuto
      refetchOnWindowFocus: true
    }
  );

  // Crear mapeo de IDs de taller a códigos para ORs
  const mapeoORsPorTaller = useMemo(() => {
    if (!talleres || !orsPorTallerData?.orsPorTaller) return {};

    const mapeo = {};
    // El backend devuelve las ORs por código de taller (agrupado por "$taller")
    talleres.forEach(taller => {
      const codigo = taller.codigo;
      if (orsPorTallerData.orsPorTaller[codigo] !== undefined) {
        mapeo[codigo] = orsPorTallerData.orsPorTaller[codigo];
      }
    });

    return mapeo;
  }, [talleres, orsPorTallerData]);



  // Función para limpiar filtros (vuelve a los últimos 45 días)
  const limpiarFiltros = () => {
    setFechaDesde(getUltimos45Dias());
    setFechaHasta(getHoy());
    setFiltrosActivos(true);
  };



  // Verificar si hay filtros activos y forzar actualización de consultas
  React.useEffect(() => {
    setFiltrosActivos(fechaDesde || fechaHasta);
    
    // Forzar actualización de las consultas cuando cambien las fechas
    if (fechaDesde && fechaHasta) {
      // Las consultas se actualizarán automáticamente debido a las dependencias en useQuery
      console.log('Fechas actualizadas:', { fechaDesde, fechaHasta });
    }
  }, [fechaDesde, fechaHasta]);






  // Función para formatear números como moneda
  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      const millions = amount / 1000000;
      return `$${millions.toFixed(1)}M`;
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Función para formatear moneda sin decimales (redondeada) en millones
  const formatCurrencyNoDecimals = (amount) => {
    const roundedAmount = Math.round(amount);
    if (roundedAmount >= 1000000) {
      const millions = roundedAmount / 1000000;
      return `$${millions.toFixed(1)}M`;
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(roundedAmount);
  };

  // Función para exportar a Excel
  const exportarExcel = () => {
    if (!datosMensuales) return;

    // Preparar datos para Excel
    const meses = datosMensuales.mesesDisponibles || [];
    const headers = ['Taller'];
    
    // Agregar headers de meses con subcolumnas
    meses.forEach(mesKey => {
      const [year, month] = mesKey.split('-');
      const nombreMes = format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMM yyyy', { locale: es });
      headers.push(`${nombreMes} - Realizados`, `${nombreMes} - Aceptados`, `${nombreMes} - Conversión (%)`, `${nombreMes} - Monto`);
    });

    // Crear datos de filas
    const rows = [];
    
    // Agregar filas de talleres
    datosMensuales.talleres.forEach(tallerData => {
      const row = [tallerData.taller];
      meses.forEach(mesKey => {
        const datos = tallerData.meses[mesKey] || { realizados: 0, aceptados: 0, conversion: 0, monto: 0 };
        row.push(datos.realizados, datos.aceptados, datos.conversion, datos.monto);
      });
      rows.push(row);
    });

    // Agregar fila de totales
    const totalRow = ['TOTAL MES'];
    meses.forEach(mesKey => {
      const totales = datosMensuales.totalesPorMes[mesKey] || { realizados: 0, aceptados: 0, conversion: 0, monto: 0 };
      totalRow.push(totales.realizados, totales.aceptados, totales.conversion, totales.monto);
    });
    rows.push(totalRow);

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Ajustar ancho de columnas
    const colWidths = [{ wch: 20 }]; // Columna taller
    meses.forEach(() => {
      colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }); // 4 columnas por mes
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Estadísticas Mensuales');
    
    // Descargar archivo
    const fileName = `estadisticas_mensuales_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Función para exportar a imagen
  const exportarImagen = async () => {
    const tablaElement = document.getElementById('tabla-mensual-talleres');
    if (!tablaElement) return;

    try {
      // Crear un contenedor temporal con estilos optimizados para exportación
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.backgroundColor = '#ffffff'; // Fondo blanco
      tempContainer.style.borderRadius = '8px';
      tempContainer.style.padding = '20px';
      tempContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
      
      // Clonar la tabla con estilos mejorados
      const tablaClonada = tablaElement.cloneNode(true);
      
      // Aplicar estilos mejorados para la imagen (tema claro con fondo blanco)
      tablaClonada.style.backgroundColor = '#ffffff';
      tablaClonada.style.color = '#000000'; // Texto negro
      tablaClonada.style.fontFamily = 'Inter, system-ui, sans-serif';
      tablaClonada.style.fontSize = '14px';
      tablaClonada.style.lineHeight = '1.4';
      tablaClonada.style.borderCollapse = 'collapse';
      tablaClonada.style.borderRadius = '6px';
      tablaClonada.style.overflow = 'hidden';
      
      // Mejorar estilos de encabezados (fondo claro para mejor contraste)
      const headers = tablaClonada.querySelectorAll('th');
      headers.forEach((header, index) => {
        // Ajustar ancho según el tipo de columna
        let headerWidth = '260px'; // Ancho total para 4 subcolumnas: 60+60+60+80 = 260px
        let headerMinWidth = '260px';
        
        // La primera columna es "Taller"
        if (index === 0) {
          headerWidth = '120px';
          headerMinWidth = '120px';
        }
        
        header.style.backgroundColor = '#f8f9fa'; // Fondo gris muy claro para mejor contraste
        header.style.color = '#212529'; // Texto negro más intenso
        header.style.fontWeight = '700'; // Peso más fuerte para mejor visibilidad
        header.style.padding = '8px 0'; // Padding horizontal reducido para mejor alineación
        header.style.borderBottom = '2px solid #dee2e6'; // Borde más visible
        header.style.borderRight = '1px solid #dee2e6';
        header.style.textAlign = 'center';
        header.style.minWidth = headerMinWidth;
        header.style.width = headerWidth;
        header.style.maxWidth = headerWidth;
        header.style.position = 'relative';
        header.style.fontSize = '14px'; // Tamaño de fuente explícito
        header.style.lineHeight = '1.4';
        header.style.fontFamily = 'Inter, system-ui, sans-serif';
        header.style.textShadow = 'none'; // Eliminar cualquier sombra de texto
        header.style.boxSizing = 'border-box';
        header.style.display = 'table-cell';
        header.style.verticalAlign = 'middle';
      });
      
      // Estilos específicos para el encabezado de "Taller" (primera columna)
      const tallerHeader = tablaClonada.querySelector('th:first-child');
      if (tallerHeader) {
        tallerHeader.style.minWidth = '120px';
        tallerHeader.style.width = '120px';
        tallerHeader.style.textAlign = 'left';
        tallerHeader.style.paddingLeft = '12px';
        tallerHeader.style.color = '#212529'; // Texto negro más intenso
        tallerHeader.style.fontSize = '14px';
        tallerHeader.style.fontWeight = '700'; // Peso más fuerte
        tallerHeader.style.backgroundColor = '#f8f9fa'; // Mismo fondo que otros encabezados
      }
      
      // Asegurar alineación correcta de las subcolumnas del encabezado
      const subHeaders = tablaClonada.querySelectorAll('th div');
      subHeaders.forEach(subHeader => {
        // Solo aplicar estilos a los divs que no son parte del grid
        if (!subHeader.classList.contains('grid') && !subHeader.querySelector('.grid')) {
          subHeader.style.minWidth = '260px'; // Ancho total del contenedor
          subHeader.style.width = '260px';
          subHeader.style.boxSizing = 'border-box';
          subHeader.style.color = '#212529'; // Texto negro más intenso
          subHeader.style.backgroundColor = 'transparent'; // Fondo transparente
          subHeader.style.margin = '0';
          subHeader.style.padding = '0';
          subHeader.style.fontSize = '14px';
          subHeader.style.fontWeight = '700'; // Peso más fuerte
          subHeader.style.fontFamily = 'Inter, system-ui, sans-serif';
          subHeader.style.textShadow = 'none'; // Sin sombra de texto
        }
      });
      
      // Asegurar que el grid layout funcione correctamente
      const gridContainers = tablaClonada.querySelectorAll('th div.grid');
      gridContainers.forEach(grid => {
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '60px 60px 60px 80px'; // 4 columnas con anchos específicos
        grid.style.gap = '0';
        grid.style.width = '260px';
        grid.style.margin = '0';
        grid.style.padding = '0';
        grid.style.borderCollapse = 'collapse';
        grid.style.tableLayout = 'fixed';
      });
      
      // Asegurar que la tabla tenga el layout fijo para alineación perfecta
      tablaClonada.style.tableLayout = 'fixed';
      tablaClonada.style.width = '100%';
      tablaClonada.style.borderCollapse = 'separate';
      tablaClonada.style.borderSpacing = '0';
      
      // Estilos para las subcolumnas de los meses (Real., Acep., Conv., Monto)
      const monthSubHeaders = tablaClonada.querySelectorAll('th div.grid div');
      monthSubHeaders.forEach((subHeader, index) => {
        // Anchos específicos para cada una de las 4 subcolumnas
        let columnWidth = '60px'; // Ancho base
        let fontSize = '12px'; // Fuente legible
        let padding = '4px 2px'; // Padding adecuado
        
        // Ajustar según el tipo de columna (debe haber exactamente 4: Real., Acep., Conv., Monto)
        const textContent = subHeader.textContent.trim();
        
        // Asignar anchos específicos para cada subcolumna
        if (textContent === 'Real.') {
          columnWidth = '60px';
          fontSize = '12px';
        } else if (textContent === 'Acep.') {
          columnWidth = '60px';
          fontSize = '12px';
        } else if (textContent === 'Conv.') {
          columnWidth = '60px';
          fontSize = '12px';
        } else if (textContent === 'Monto') {
          columnWidth = '80px'; // Más ancho para montos
          fontSize = '12px';
        }
        
        subHeader.style.minWidth = columnWidth;
        subHeader.style.width = columnWidth;
        subHeader.style.maxWidth = columnWidth;
        subHeader.style.boxSizing = 'border-box';
        subHeader.style.color = '#212529'; // Texto negro más intenso
        subHeader.style.backgroundColor = 'transparent';
        subHeader.style.textAlign = 'center';
        subHeader.style.padding = padding;
        subHeader.style.fontSize = fontSize;
        subHeader.style.fontWeight = '600';
        subHeader.style.fontFamily = 'Inter, system-ui, sans-serif';
        subHeader.style.lineHeight = '1.2';
        subHeader.style.textShadow = 'none';
        subHeader.style.whiteSpace = 'nowrap';
        subHeader.style.overflow = 'visible'; // Permitir que el texto sea visible
        subHeader.style.display = 'block'; // Asegurar que se muestre como bloque
      });
      
      // Asegurar que el texto principal de los encabezados de meses sea visible
      const monthHeaders = tablaClonada.querySelectorAll('th div:first-child');
      monthHeaders.forEach(monthHeader => {
        monthHeader.style.color = '#212529'; // Texto negro más intenso
        monthHeader.style.fontSize = '14px';
        monthHeader.style.fontWeight = '700'; // Peso más fuerte
        monthHeader.style.padding = '4px 0';
        monthHeader.style.fontFamily = 'Inter, system-ui, sans-serif';
        monthHeader.style.backgroundColor = 'transparent';
        monthHeader.style.textShadow = 'none'; // Sin sombra de texto
      });
      
      // Mejorar estilos de celdas de datos
      const celdas = tablaClonada.querySelectorAll('td');
      celdas.forEach((celda, index) => {
        celda.style.padding = '6px 8px';
        celda.style.borderBottom = '1px solid #e5e5e5';
        celda.style.borderRight = '1px solid #e5e5e5';
        celda.style.textAlign = 'center';
        celda.style.color = '#000000'; // Texto negro
        celda.style.boxSizing = 'border-box';
        
        // Ajustar ancho según el tipo de columna
        const isFirstColumn = celda.cellIndex === 0;
        if (isFirstColumn) {
          // Columna "Taller"
          celda.style.minWidth = '120px';
          celda.style.width = '120px';
          celda.style.maxWidth = '120px';
          celda.style.textAlign = 'left';
          celda.style.paddingLeft = '12px';
        } else {
          // Columnas de datos - deben coincidir exactamente con las subcolumnas
          // Patrón: Real (60px) + Acep (60px) + Conv (60px) + Monto (80px)
          const cellIndex = celda.cellIndex;
          
          // Cada grupo de 4 celdas corresponde a un mes
          const positionInGroup = (cellIndex - 1) % 4;
          let cellWidth = '60px'; // Ancho base
          
          // Asignar anchos exactos según la posición en el grupo
          if (positionInGroup === 0) {
            // Primera celda del grupo: Real
            cellWidth = '60px';
          } else if (positionInGroup === 1) {
            // Segunda celda del grupo: Acep
            cellWidth = '60px';
          } else if (positionInGroup === 2) {
            // Tercera celda del grupo: Conv (porcentajes)
            cellWidth = '60px';
          } else if (positionInGroup === 3) {
            // Cuarta celda del grupo: Monto
            cellWidth = '80px';
          }
          
          // Aplicar estilos con anchos exactos
          celda.style.minWidth = cellWidth;
          celda.style.width = cellWidth;
          celda.style.maxWidth = cellWidth;
          celda.style.fontSize = '12px';
          celda.style.fontWeight = '500';
          celda.style.boxSizing = 'border-box';
          celda.style.display = 'table-cell';
          celda.style.verticalAlign = 'middle';
        }
        
        // Alternar colores de fondo para mejor legibilidad
        if (celda.textContent === 'TOTAL MES') {
          celda.style.backgroundColor = '#f8f9fa'; // Gris muy claro para destacar totales
          celda.style.color = '#000000';
          celda.style.fontWeight = '700';
        } else {
          // Fondo blanco uniforme para todas las filas de datos
          celda.style.backgroundColor = '#ffffff';
        }
      });
      
      // Mejorar colores de conversión (mantener colores originales pero adaptados)
      const celdasConversion = tablaClonada.querySelectorAll('.text-green-400, .text-yellow-400, .text-red-400');
      celdasConversion.forEach(celda => {
        if (celda.classList.contains('text-green-400')) {
          celda.style.color = '#22c55e'; // Verde
          celda.style.fontWeight = '600';
        } else if (celda.classList.contains('text-yellow-400')) {
          celda.style.color = '#eab308'; // Amarillo
          celda.style.fontWeight = '600';
        } else if (celda.classList.contains('text-red-400')) {
          celda.style.color = '#ef4444'; // Rojo
          celda.style.fontWeight = '600';
        }
      });
      
      // Agregar al DOM temporal
      tempContainer.appendChild(tablaClonada);
      document.body.appendChild(tempContainer);
      
      // Capturar con configuración optimizada
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff', // Fondo blanco
        scale: 3, // Mayor resolución para mejor calidad
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: tempContainer.scrollWidth,
        height: tempContainer.scrollHeight
      });

      // Limpiar elemento temporal
      document.body.removeChild(tempContainer);

      // Crear enlace de descarga
      const link = document.createElement('a');
      link.download = `estadisticas_mensuales_${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error al exportar imagen:', error);
    }
  };

  // Función para formatear fechas
  const formatDate = (dateInput) => {
    let fecha;
    
    if (typeof dateInput === 'string') {
      // Si es un string, extraer año, mes y día directamente para evitar problemas de zona horaria
      const [year, month, day] = dateInput.split('-').map(Number);
      fecha = new Date(year, month - 1, day, 12, 0, 0);
    } else if (dateInput instanceof Date) {
      // Si es un objeto Date, usarlo directamente
      fecha = dateInput;
    } else {
      // Si no es ninguno de los anteriores, intentar crear una fecha
      fecha = new Date(dateInput);
    }
    
    return format(fecha, 'dd/MM/yyyy', { locale: es });
  };




  // Función para obtener el nombre del taller
  const getTallerNombre = (codigoTaller) => {
    if (!talleres || !codigoTaller) return codigoTaller;
    const taller = talleres.find(t => t.codigo === codigoTaller);
    return taller ? taller.nombre : codigoTaller;
  };

  // Mapear y unificar los datos por nombre de taller
  const estadisticasPorTallerConNombres = (estadisticasPorTaller || []).reduce((acc, item) => {
    const tallerNombre = getTallerNombre(item.taller);
    
    // Buscar si ya existe un registro para este nombre de taller
    const existingIndex = acc.findIndex(t => t.tallerNombre === tallerNombre);
    
    if (existingIndex >= 0) {
      // Si existe, sumar los valores
      acc[existingIndex].cantidad += item.cantidad || 0;
      acc[existingIndex].importe += item.importe || 0;
      acc[existingIndex].costo += item.costo || 0;
      acc[existingIndex].pvp += item.pvp || 0;
      // Recalcular margen
      acc[existingIndex].margen = acc[existingIndex].importe > 0 ? 
        ((acc[existingIndex].importe - acc[existingIndex].costo) / acc[existingIndex].importe) * 100 : 0;
    } else {
      // Si no existe, crear nuevo registro
      acc.push({
        ...item,
        tallerNombre: tallerNombre,
        margen: item.importe > 0 ? ((item.importe - item.costo) / item.importe) * 100 : 0
      });
    }
    
    return acc;
  }, []).sort((a, b) => b.cantidad - a.cantidad); // Ordenar por cantidad descendente
  
  // Calcular totales para los títulos
  const totalCantidadPresupuestos = estadisticasPorTallerConNombres.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  const totalImportePresupuestos = estadisticasPorTallerConNombres.reduce((sum, item) => sum + (item.importe || 0), 0);

  // Componente de tarjeta de estadística
  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="card p-6 hover-lift">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loadingStats || loadingTalleres) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">
            Resumen de presupuestos y estadísticas del sistema
          </p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-sm">Última actualización</p>
          <p className="text-white font-medium">{formatDate(new Date())}</p>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-white">Filtros por Fecha</h3>
            {filtrosActivos && (
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                {fechaDesde === getUltimos45Dias() && fechaHasta === getHoy() ? 'Últimos 45 días' : 'Filtrado'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={limpiarFiltros}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Últimos 45 días
            </button>
            <button
              onClick={() => {
                setFechaDesde(getPrimerDiaMes());
                setFechaHasta(getUltimoDiaMes());
                setFiltrosActivos(true);
              }}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Mes actual
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-slate-400 text-sm font-medium mb-2">
              Fecha desde
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Seleccionar fecha"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-slate-400 text-sm font-medium mb-2">
              Fecha hasta
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Seleccionar fecha"
              />
            </div>
          </div>
          
          <div className="flex items-end">
            <div className="text-slate-400 text-sm">
              {filtrosActivos ? (
                <div>
                  <p>Período seleccionado:</p>
                  <p className="text-white">
                    {fechaDesde && `Desde: ${formatDate(fechaDesde)}`}
                    {fechaDesde && fechaHasta && ' - '}
                    {fechaHasta && `Hasta: ${formatDate(fechaHasta)}`}
                  </p>
                </div>
              ) : (
                <p>Mostrando todos los datos</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta de presupuestos abiertos pendientes */}
      <div className="grid grid-cols-1 gap-6">
        {/* Tarjeta de presupuestos abiertos pendientes por taller */}
        <div className="card p-6">
          {/* Encabezado con iconos */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <h3 className="text-lg font-semibold text-white">
                Presupuestos Pendientes
              </h3>
              <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
            {filtrosActivos && (
              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                Filtrado
              </span>
            )}
          </div>
          
          {loadingAbiertosPendientes ? (
            <div className="flex items-center justify-center h-32">
              <div className="spinner w-8 h-8"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                if (!abiertosPendientesPorTaller || abiertosPendientesPorTaller.length === 0) {
                  return (
                    <div className="text-center py-8">
                      {/* Número principal grande */}
                      <div className="text-6xl font-bold text-green-400">0</div>
                      <div className="text-xl font-medium text-green-400 mb-4">
                        ({formatCurrencyNoDecimals(0)})
                      </div>
                      <div className="text-center py-4 text-slate-400">
                        <div className="text-2xl mb-2">🎉</div>
                        <p>No hay presupuestos pendientes</p>
                      </div>
                    </div>
                  );
                }

                // Mapear con nombres de talleres y agrupar por nombre
                const talleresConNombres = abiertosPendientesPorTaller.reduce((acc, item) => {
                  const tallerNombre = (() => {
                    const taller = talleres?.find(t => t.codigo === item.taller);
                    return taller ? taller.nombre : item.taller;
                  })();
                  
                  // Buscar si ya existe un registro para este nombre de taller
                  const existingIndex = acc.findIndex(t => t.tallerNombre === tallerNombre);
                  
                  if (existingIndex >= 0) {
                    // Si existe, sumar los valores
                    acc[existingIndex].cantidad += item.cantidad || 0;
                    acc[existingIndex].importe += item.importe || 0;
                  } else {
                    // Si no existe, crear nuevo registro
                    acc.push({
                      ...item,
                      tallerNombre: tallerNombre
                    });
                  }
                  
                  return acc;
                }, []).sort((a, b) => (b.importe || 0) - (a.importe || 0));

                const totalPendientes = talleresConNombres.reduce((sum, item) => sum + (item.cantidad || 0), 0);

                return (
                  <>
                    {/* Número principal grande */}
                    <div className="text-center">
                      <div className={`text-6xl font-bold ${totalPendientes === 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {totalPendientes}
                      </div>
                      <div className={`text-xl font-medium mb-6 ${totalPendientes === 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ({formatCurrencyNoDecimals(totalesAbiertosPendientes.importe)})
                      </div>
                    </div>

                    {/* Elementos horizontales en una sola línea */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {talleresConNombres.map((item, index) => (
                        <div 
                          key={item.taller}
                          className="bg-slate-700/70 rounded-lg px-3 py-2 border border-slate-600 flex-shrink-0"
                        >
                          <div className="text-center">
                            <span className="text-xs font-medium text-white whitespace-nowrap block">
                              {item.tallerNombre}: <span className={`font-bold ${item.cantidad === 0 ? 'text-green-400' : 'text-red-400'}`}>{item.cantidad}</span>
                            </span>
                            <span className={`text-xs font-medium whitespace-nowrap block mt-0.5 ${item.cantidad === 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ({formatCurrencyNoDecimals(item.importe || 0)})
                            </span>
                            <span className="text-xs font-medium text-slate-400 whitespace-nowrap block mt-0.5">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Tarjeta de presupuestos aceptados por taller */}
        <div className="card p-6">
          {/* Encabezado con iconos */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">$</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold text-white">
                  Presupuestos Aceptados
                </h3>
                <p className="text-xs text-slate-400 font-normal mt-1">
                  (presupuestos con ORs: {conteoPresupuestosConORs})
                </p>
              </div>
              <div className="w-6 h-6 bg-green-500 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
            {filtrosActivos && (
              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                Filtrado
              </span>
            )}
          </div>
          
          {loadingAceptados ? (
            <div className="flex items-center justify-center h-32">
              <div className="spinner w-8 h-8"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                if (!aceptadosPorTaller || aceptadosPorTaller.length === 0) {
                  return (
                    <div className="text-center py-8">
                      {/* Número principal grande */}
                      <div className="text-6xl font-bold text-green-400">0</div>
                      <div className="text-xl font-medium text-green-400 mb-4">
                        ({formatCurrencyNoDecimals(0)})
                      </div>
                      <div className="text-center py-4 text-slate-400">
                        <div className="text-2xl mb-2">📈</div>
                        <p>No hay presupuestos aceptados</p>
                      </div>
                    </div>
                  );
                }

                // Mapear con nombres de talleres y agrupar por nombre
                const talleresAceptadosConNombres = aceptadosPorTaller.reduce((acc, item) => {
                  const tallerInfo = (() => {
                    const taller = talleres?.find(t => t.codigo === item.taller);
                    return taller ? { nombre: taller.nombre, id: taller._id } : { nombre: item.taller, id: null };
                  })();
                  
                  // Buscar si ya existe un registro para este nombre de taller
                  const existingIndex = acc.findIndex(t => t.tallerNombre === tallerInfo.nombre);
                  
                  if (existingIndex >= 0) {
                    // Si existe, sumar los valores
                    acc[existingIndex].cantidad += item.cantidad || 0;
                    acc[existingIndex].importe += item.importe || 0;
                    // Sumar ORs usando el mapeo por código de taller
                    acc[existingIndex].ors = (acc[existingIndex].ors || 0) + (mapeoORsPorTaller[item.taller] || 0);
                  } else {
                    // Si no existe, crear nuevo registro
                    acc.push({
                      ...item,
                      tallerNombre: tallerInfo.nombre,
                      tallerId: tallerInfo.id,
                      // Inicializar ORs para este código de taller
                      ors: mapeoORsPorTaller[item.taller] || 0
                    });
                  }
                  
                  return acc;
                }, []).sort((a, b) => (b.importe || 0) - (a.importe || 0));

                const totalAceptados = talleresAceptadosConNombres.reduce((sum, item) => sum + (item.cantidad || 0), 0);

                return (
                  <>
                    {/* Número principal grande */}
                    <div className="text-center">
                      <div className="text-6xl font-bold text-green-400">
                        {totalAceptados}
                      </div>
                      <div className="text-xl font-medium mb-6 text-green-400">
                        ({formatCurrencyNoDecimals(totalesAceptados.importe)})
                      </div>
                    </div>

                    {/* Elementos horizontales en una sola línea */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {talleresAceptadosConNombres.map((item, index) => (
                        <div 
                          key={item.taller}
                          className="bg-green-700/20 rounded-lg px-3 py-2 border border-green-600 flex-shrink-0"
                        >
                          <div className="text-center">
                            <span className="text-xs font-medium text-white whitespace-nowrap block">
                              {item.tallerNombre}: <span className={`font-bold ${item.cantidad === 0 ? 'text-red-400' : 'text-green-400'}`}>{item.cantidad}</span>
                            </span>
                            <span className={`text-xs font-medium whitespace-nowrap block mt-0.5 ${item.cantidad === 0 ? 'text-red-400' : 'text-green-400'}`}>
                              ({formatCurrencyNoDecimals(item.importe || 0)})
                            </span>
                            <span className="text-xs font-medium text-blue-400 whitespace-nowrap block mt-0.5">
                              ORs: {item.ors || 0}
                            </span>
                            <span className="text-xs font-medium text-slate-400 whitespace-nowrap block mt-0.5">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Tarjeta de presupuestos rechazados por taller */}
        <div className="card p-6">
          {/* Encabezado con iconos */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✕</span>
              </div>
              <h3 className="text-lg font-semibold text-white">
                Presupuestos Rechazados
              </h3>
              <div className="w-6 h-6 bg-red-500 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs">✕</span>
              </div>
            </div>
            {filtrosActivos && (
              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                Filtrado
              </span>
            )}
          </div>
          
          {loadingRechazados ? (
            <div className="flex items-center justify-center h-32">
              <div className="spinner w-8 h-8"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                if (!rechazadosPorTaller || rechazadosPorTaller.length === 0) {
                  return (
                    <div className="text-center py-8">
                      {/* Número principal grande */}
                      <div className="text-6xl font-bold text-red-400">0</div>
                      <div className="text-xl font-medium text-red-400 mb-4">
                        ({formatCurrencyNoDecimals(0)})
                      </div>
                      <div className="text-center py-4 text-slate-400">
                        <div className="text-2xl mb-2">🎯</div>
                        <p>No hay presupuestos rechazados</p>
                      </div>
                    </div>
                  );
                }

                // Agrupar por nombre de taller respetando el mapeo
                const talleresRechazadosConNombres = rechazadosPorTaller.reduce((acc, item) => {
                  const tallerNombre = (() => {
                    const taller = talleres?.find(t => t.codigo === item.taller);
                    return taller ? taller.nombre : item.taller;
                  })();
                  
                  // Buscar si ya existe un registro para este nombre de taller
                  const existingIndex = acc.findIndex(t => t.tallerNombre === tallerNombre);
                  
                  if (existingIndex >= 0) {
                    // Si existe, sumar solo cantidad e importe, NO los motivos
                    acc[existingIndex].cantidad += (item.cantidad || 0);
                    acc[existingIndex].importe += item.importe || 0;
                  } else {
                    // Si no existe, crear nuevo registro con los datos originales del backend
                    acc.push({
                      ...item,
                      tallerNombre: tallerNombre
                    });
                  }
                  
                  return acc;
                }, []).sort((a, b) => (b.importe || 0) - (a.importe || 0));

                // Los porcentajes ya vienen calculados correctamente del backend


                const totalRechazados = talleresRechazadosConNombres.reduce((sum, item) => sum + (item.cantidad || 0), 0);

                // Calcular totales de motivos de rechazo
                const totalesMotivos = {
                  'No responde': 0,
                  'Precio elevado': 0,
                  'Tiempo de demora': 0
                };

                talleresRechazadosConNombres.forEach(taller => {
                  if (taller.motivosRechazo) {
                    Object.keys(totalesMotivos).forEach(motivo => {
                      totalesMotivos[motivo] += taller.motivosRechazo[motivo]?.cantidad || 0;
                    });
                  }
                });

                const totalMotivos = Object.values(totalesMotivos).reduce((sum, cantidad) => sum + cantidad, 0);

                return (
                  <>
                    {/* Número principal grande - alineado con otros KPIs */}
                    <div className="text-center mb-6">
                      <div className="text-6xl font-bold text-red-400">
                        {totalRechazados}
                      </div>
                      <div className="text-xl font-medium text-red-400">
                        ({formatCurrencyNoDecimals(totalesRechazados.importe)})
                      </div>
                    </div>

                    {/* Detalle de motivos de rechazo - debajo del KPI principal */}
                    <div className="mb-6">
                      <div className="flex justify-center space-x-4">
                        {Object.entries(totalesMotivos).map(([motivo, cantidad]) => {
                          if (cantidad > 0) {
                            const porcentaje = totalMotivos > 0 ? Math.round((cantidad / totalMotivos) * 100) : 0;
                            return (
                              <div key={motivo} className="text-center">
                                <div className="flex items-center justify-center space-x-1 mb-1">
                                  <span className="text-sm">
                                    {motivo === 'No responde' && '📵'}
                                    {motivo === 'Precio elevado' && '💰'}
                                    {motivo === 'Tiempo de demora' && '⏰'}
                                  </span>
                                  <span className="text-xs text-white">{motivo}</span>
                                </div>
                                <div className="text-red-400 font-bold text-xs">{cantidad}</div>
                                <div className="text-xs text-red-300">({porcentaje}%)</div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>

                    {/* Elementos horizontales en una sola línea */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      {talleresRechazadosConNombres.map((item, index) => (
                        <div 
                          key={item.tallerNombre}
                          className="bg-red-700/20 rounded-lg px-3 py-2 border border-red-600 flex-shrink-0"
                        >
                          <div className="text-center">
                            <span className="text-xs font-medium text-white whitespace-nowrap block">
                              {item.tallerNombre}: <span className={`font-bold ${item.cantidad === 0 ? 'text-green-400' : 'text-red-400'}`}>{item.cantidad}</span>
                            </span>
                            <span className={`text-xs font-medium whitespace-nowrap block mt-0.5 ${item.cantidad === 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ({formatCurrencyNoDecimals(item.importe || 0)})
                            </span>
                            
                            {/* Motivos de rechazo */}
                            {item.cantidad > 0 && item.motivosRechazo && (
                              <div className="mt-1 space-y-0.5">
                                {Object.entries(item.motivosRechazo).map(([motivo, datos]) => {
                                  if (datos.cantidad > 0) {
                                    return (
                                      <div key={motivo} className="text-xs text-orange-300">
                                        {motivo === 'No responde' && '📵'} 
                                        {motivo === 'Precio elevado' && '💰'} 
                                        {motivo === 'Tiempo de demora' && '⏰'} 
                                        {datos.porcentaje}%
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            )}
                            
                            <span className="text-xs font-medium text-slate-400 whitespace-nowrap block mt-0.5">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Tarjeta de conversión por taller */}
        <div className="card p-6">
          {/* Encabezado con iconos */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">%</span>
              </div>
              <h3 className="text-lg font-semibold text-white">
                Conversión
              </h3>
              <div className="w-6 h-6 bg-purple-500 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs">📊</span>
              </div>
            </div>
            {filtrosActivos && (
              <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                Filtrado
              </span>
            )}
          </div>
          
          {loadingConversion ? (
            <div className="flex items-center justify-center h-32">
              <div className="spinner w-8 h-8"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                if (!conversionPorTaller || conversionPorTaller.length === 0) {
                  return (
                    <div className="text-center py-8">
                      {/* Número principal grande */}
                      <div className="text-6xl font-bold text-purple-400">0%</div>
                      <div className="text-xl font-medium text-purple-400 mb-4">
                        ({totalesConversion.aceptados}/{totalesConversion.total})
                      </div>
                      <div className="text-center py-4 text-slate-400">
                        <div className="text-2xl mb-2">📊</div>
                        <p>No hay datos de conversión</p>
                      </div>
                    </div>
                  );
                }

                // Mapear con nombres de talleres y agrupar por nombre
                const talleresConversionConNombres = conversionPorTaller.reduce((acc, item) => {
                  const tallerNombre = (() => {
                    const taller = talleres?.find(t => t.codigo === item.taller);
                    return taller ? taller.nombre : item.taller;
                  })();
                  
                  // Buscar si ya existe un registro para este nombre de taller
                  const existingIndex = acc.findIndex(t => t.tallerNombre === tallerNombre);
                  
                  if (existingIndex >= 0) {
                    // Si existe, sumar los valores
                    acc[existingIndex].total += item.total || 0;
                    acc[existingIndex].aceptados += item.aceptados || 0;
                    acc[existingIndex].importeTotal += item.importeTotal || 0;
                    acc[existingIndex].importeAceptados += item.importeAceptados || 0;
                    
                    // Recalcular conversión después de sumar
                    if (acc[existingIndex].total > 0) {
                      acc[existingIndex].conversion = Math.round((acc[existingIndex].aceptados / acc[existingIndex].total) * 100);
                    } else {
                      acc[existingIndex].conversion = 0;
                    }
                  } else {
                    // Si no existe, crear nuevo registro
                    acc.push({
                      ...item,
                      tallerNombre: tallerNombre
                    });
                  }
                  
                  return acc;
                }, []).sort((a, b) => (b.conversion || 0) - (a.conversion || 0));

                return (
                  <>
                    {/* Número principal grande */}
                    <div className="text-center">
                      <div className="text-6xl font-bold text-purple-400">
                        {totalesConversion.conversion}%
                      </div>
                      <div className="text-xl font-medium mb-6 text-purple-400">
                        ({totalesConversion.aceptados}/{totalesConversion.total})
                      </div>
                    </div>

                    {/* Elementos horizontales en una sola línea */}
                    <div className="flex flex-wrap gap-1 justify-center">
                      {talleresConversionConNombres.map((item, index) => (
                        <div 
                          key={item.tallerNombre}
                          className="bg-purple-700/20 rounded-lg px-2 py-1.5 border border-purple-600 flex-shrink-0"
                        >
                          <div className="text-center">
                            <span className="text-xs font-medium text-white whitespace-nowrap block">
                              {item.tallerNombre}: <span className={`font-bold ${item.conversion >= 50 ? 'text-green-400' : item.conversion >= 25 ? 'text-yellow-400' : 'text-red-400'}`}>{item.conversion}%</span>
                            </span>
                            <span className={`text-xs font-medium whitespace-nowrap block mt-0.5 ${item.conversion >= 50 ? 'text-green-400' : item.conversion >= 25 ? 'text-yellow-400' : 'text-red-400'}`}>
                              ({item.aceptados}/{item.total})
                            </span>
                            <span className="text-xs font-medium text-slate-400 whitespace-nowrap block mt-0.5">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

       </div>

       {/* Gráficos de estadísticas por taller */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Gráfico de cantidad de presupuestos por taller */}
         <div className="card p-6">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-white">
               Cantidad de Presupuestos por Taller (Total: {totalCantidadPresupuestos})
             </h3>
             {filtrosActivos && (
               <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                 Filtrado
               </span>
             )}
           </div>
           <ResponsiveContainer width="100%" height={300}>
             <BarChart data={estadisticasPorTallerConNombres} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis 
                dataKey="tallerNombre" 
                stroke="#94a3b8"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
               <YAxis hide />
               <Tooltip 
                 contentStyle={{
                   backgroundColor: '#1e293b',
                   border: '1px solid #475569',
                   borderRadius: '8px',
                   color: '#e2e8f0'
                 }}
                 formatter={(value) => [value, 'Cantidad']}
               />
                               <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="cantidad" position="top" fill="#94a3b8" fontSize={12} fontWeight="bold" />
                </Bar>
             </BarChart>
           </ResponsiveContainer>
         </div>

                            {/* Gráfico de importe total por taller */}
         <div className="card p-6">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-white">
               Importe Total por Taller (Total: ${(totalImportePresupuestos / 1000000).toFixed(1)}M)
             </h3>
             {filtrosActivos && (
               <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                 Filtrado
               </span>
             )}
           </div>
           <ResponsiveContainer width="100%" height={300}>
             <BarChart data={estadisticasPorTallerConNombres} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis 
                dataKey="tallerNombre" 
                stroke="#94a3b8"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
               <YAxis hide />
               <Tooltip 
                 contentStyle={{
                   backgroundColor: '#1e293b',
                   border: '1px solid #475569',
                   borderRadius: '8px',
                   color: '#e2e8f0'
                 }}
                 formatter={(value) => [formatCurrency(value), 'Importe']}
               />
                               <Bar dataKey="importe" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList 
                    dataKey="importe" 
                    position="top" 
                    fill="#94a3b8" 
                    fontSize={12}
                    fontWeight="bold"
                    formatter={(value) => {
                      const millions = value / 1000000;
                      if (millions >= 1) {
                        return `$${Math.round(millions)}M`;
                      } else {
                        return `$${millions.toFixed(1)}M`;
                      }
                    }}
                  />
                </Bar>
             </BarChart>
           </ResponsiveContainer>
         </div>
       </div>

       {/* Tabla de estadísticas mensuales por taller */}
       <div className="card p-6">
         <div className="flex items-center justify-between mb-6">
           <h3 className="text-lg font-semibold text-white">
             Estadísticas Mensuales por Taller
             {datosMensuales?.mesesDisponibles && datosMensuales.mesesDisponibles.length > 0 && (
               <span className="text-sm text-slate-400 ml-2">
                 ({format(new Date(parseInt(datosMensuales.mesesDisponibles[0].split('-')[0]), parseInt(datosMensuales.mesesDisponibles[0].split('-')[1]) - 1, 1), 'MMM yyyy', { locale: es }).charAt(0).toUpperCase() + format(new Date(parseInt(datosMensuales.mesesDisponibles[0].split('-')[0]), parseInt(datosMensuales.mesesDisponibles[0].split('-')[1]) - 1, 1), 'MMM yyyy', { locale: es }).slice(1)} - {format(new Date(parseInt(datosMensuales.mesesDisponibles[datosMensuales.mesesDisponibles.length - 1].split('-')[0]), parseInt(datosMensuales.mesesDisponibles[datosMensuales.mesesDisponibles.length - 1].split('-')[1]) - 1, 1), 'MMM yyyy', { locale: es }).charAt(0).toUpperCase() + format(new Date(parseInt(datosMensuales.mesesDisponibles[datosMensuales.mesesDisponibles.length - 1].split('-')[0]), parseInt(datosMensuales.mesesDisponibles[datosMensuales.mesesDisponibles.length - 1].split('-')[1]) - 1, 1), 'MMM yyyy', { locale: es }).slice(1)})
               </span>
             )}
           </h3>
           
           {/* Botones de exportación */}
           <div className="flex gap-2">
             <button
               onClick={exportarExcel}
               disabled={!datosMensuales}
               className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200"
               title="Exportar a Excel"
             >
               <FileSpreadsheet size={16} />
               Excel
             </button>
             <button
               onClick={exportarImagen}
               disabled={!datosMensuales}
               className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200"
               title="Exportar a imagen PNG"
             >
               <Image size={16} />
               Imagen
             </button>
           </div>
         </div>
         
         {loadingMensuales ? (
           <div className="flex items-center justify-center h-32">
             <div className="spinner w-8 h-8"></div>
           </div>
         ) : datosMensuales ? (
           <div className="overflow-x-auto">
             <table id="tabla-mensual-talleres" className="w-full text-sm">
               <thead>
                 <tr>
                   <th className="sticky left-0 z-10 bg-slate-800 px-3 py-2 text-left text-slate-300 font-semibold border-r border-slate-600" style={{ minWidth: '120px', maxWidth: '120px' }}>
                     Taller
                   </th>
                   {/* Columnas de meses */}
                   {datosMensuales.mesesDisponibles?.map(mesKey => {
                     const [year, month] = mesKey.split('-');
                     const nombreMes = format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMM yyyy', { locale: es });
                     
                     return (
                       <th key={mesKey} className="border-l border-slate-600" colSpan={4} style={{ minWidth: '320px' }}>
                         <div className="px-2 py-1 text-center text-slate-300 font-semibold w-full">
                           {nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
                         </div>
                         <div className="grid grid-cols-4 gap-0 border-t border-slate-700 w-full">
                           <div className="px-2 py-1 text-xs text-slate-400 text-center border-r border-slate-700">Real.</div>
                           <div className="px-2 py-1 text-xs text-slate-400 text-center border-r border-slate-700">Acep.</div>
                           <div className="px-2 py-1 text-xs text-slate-400 text-center border-r border-slate-700">Conv.</div>
                           <div className="px-2 py-1 text-xs text-slate-400 text-center">Monto</div>
                         </div>
                       </th>
                     );
                   })}
                 </tr>
               </thead>
               <tbody>
                 {/* Filas de talleres */}
                 {datosMensuales.talleres.map((tallerData, idx) => {
                   return (
                     <tr key={tallerData.taller} className={idx % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-800/30'}>
                       <td className="sticky left-0 z-10 px-3 py-2 text-white font-medium border-r border-slate-600 whitespace-nowrap" style={{ backgroundColor: idx % 2 === 0 ? 'rgb(30 41 59 / 0.5)' : 'rgb(30 41 59 / 0.3)', minWidth: '120px', maxWidth: '120px' }}>
                         {tallerData.taller}
                       </td>
                       {datosMensuales.mesesDisponibles?.map(mesKey => {
                         const datos = tallerData.meses[mesKey] || { realizados: 0, aceptados: 0, conversion: 0, monto: 0 };
                         const colorConversion = datos.conversion >= 50 ? 'text-green-400' : datos.conversion >= 25 ? 'text-yellow-400' : 'text-red-400';
                         
                         return (
                           <React.Fragment key={mesKey}>
                             <td className="px-2 py-2 text-center text-slate-300 border-l border-r border-slate-700" style={{ minWidth: '80px' }}>
                               {datos.realizados}
                             </td>
                             <td className="px-2 py-2 text-center text-slate-300 border-r border-slate-700" style={{ minWidth: '80px' }}>
                               {datos.aceptados}
                             </td>
                             <td className={`px-2 py-2 text-center font-semibold border-r border-slate-700 ${colorConversion}`} style={{ minWidth: '80px' }}>
                               {datos.conversion}%
                             </td>
                             <td className="px-2 py-2 text-center text-slate-300 border-r border-slate-700" style={{ minWidth: '80px' }}>
                               {datos.monto > 0 ? formatCurrencyNoDecimals(datos.monto) : '-'}
                             </td>
                           </React.Fragment>
                         );
                       })}
                     </tr>
                   );
                 })}
                 
                 {/* Fila de totales */}
                 <tr className="bg-blue-900/30 border-t-2 border-blue-500">
                   <td className="sticky left-0 z-10 bg-blue-900/30 px-3 py-2 text-white font-bold border-r border-slate-600 whitespace-nowrap" style={{ minWidth: '120px', maxWidth: '120px' }}>
                     TOTAL MES
                   </td>
                   {datosMensuales.mesesDisponibles?.map(mesKey => {
                     const totales = datosMensuales.totalesPorMes[mesKey] || { realizados: 0, aceptados: 0, conversion: 0, monto: 0 };
                     const colorConversion = totales.conversion >= 50 ? 'text-green-400' : totales.conversion >= 25 ? 'text-yellow-400' : 'text-red-400';
                     
                     return (
                       <React.Fragment key={mesKey}>
                         <td className="px-2 py-2 text-center text-white font-bold border-l border-r border-slate-700" style={{ minWidth: '80px' }}>
                           {totales.realizados}
                         </td>
                         <td className="px-2 py-2 text-center text-white font-bold border-r border-slate-700" style={{ minWidth: '80px' }}>
                           {totales.aceptados}
                         </td>
                         <td className={`px-2 py-2 text-center font-bold border-r border-slate-700 ${colorConversion}`} style={{ minWidth: '80px' }}>
                           {totales.conversion}%
                         </td>
                         <td className="px-2 py-2 text-center text-white font-bold border-r border-slate-700" style={{ minWidth: '80px' }}>
                           {totales.monto > 0 ? formatCurrencyNoDecimals(totales.monto) : '-'}
                         </td>
                       </React.Fragment>
                     );
                   })}
                 </tr>
               </tbody>
             </table>
           </div>
         ) : (
           <div className="text-center py-8 text-slate-400">
             <p>No hay datos disponibles</p>
           </div>
         )}
       </div>

     </div>
   );
 };

export default Dashboard;
