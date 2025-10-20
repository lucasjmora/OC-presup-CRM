import { useEffect } from 'react';
import { useQueryClient } from 'react-query';
import { schedulerAPI } from '../services/api';

/**
 * Hook personalizado para escuchar actualizaciones del scheduler
 * y invalidar el cache de React Query cuando se cargan nuevos datos
 */
const useSchedulerUpdates = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await schedulerAPI.getStatus();
        const status = response.data;
        
        // Buscar en los logs si hay una ejecución reciente con nuevos presupuestos
        const recentLogs = status.logs?.slice(0, 5) || [];
        const hasNewData = recentLogs.some(log => 
          log.message.includes('nuevos') && 
          log.type === 'success' &&
          log.data?.nuevosPresupuestos > 0
        );

        if (hasNewData) {
          // Invalidar todas las consultas relacionadas con presupuestos
          queryClient.invalidateQueries('presupuestos');
          queryClient.invalidateQueries('estadisticas');
          queryClient.invalidateQueries('estadisticasPorTaller');
          queryClient.invalidateQueries('mesesDisponibles');
          queryClient.invalidateQueries('tiposSiniestro');
          queryClient.invalidateQueries('talleres');
          
          console.log('🔄 Cache invalidado por actualización del scheduler');
        }
      } catch (error) {
        console.error('Error verificando actualizaciones del scheduler:', error);
      }
    };

    // Verificar cada 10 segundos si hay actualizaciones
    const interval = setInterval(checkForUpdates, 10000);

    return () => clearInterval(interval);
  }, [queryClient]);
};

export default useSchedulerUpdates;

