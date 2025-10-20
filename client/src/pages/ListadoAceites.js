import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Droplets as DropletsIcon,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  Loader
} from 'lucide-react';
import { aceitesAPI, formatError } from '../services/api';

const ListadoAceites = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    litrosPorTambor: ''
  });
  const [saveResult, setSaveResult] = useState(null);

  // Consulta para obtener la lista de aceites
  const { data: aceites, isLoading, error } = useQuery(
    'aceites',
    () => aceitesAPI.getAceites().then(res => res.data),
    {
      staleTime: 0,
      cacheTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }
  );

  // Mutación para crear un nuevo aceite
  const createAceiteMutation = useMutation(
    (data) => aceitesAPI.createAceite(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('aceites');
        setIsAdding(false);
        setFormData({ sku: '', litrosPorTambor: '' });
        setSaveResult({ success: true, message: 'Aceite agregado correctamente' });
        setTimeout(() => setSaveResult(null), 3000);
      },
      onError: (error) => {
        console.error('Error al crear aceite:', error);
        setSaveResult({ success: false, message: `Error al agregar: ${formatError(error)}` });
        setTimeout(() => setSaveResult(null), 5000);
      },
    }
  );

  // Mutación para actualizar un aceite
  const updateAceiteMutation = useMutation(
    ({ id, data }) => aceitesAPI.updateAceite(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('aceites');
        setEditingId(null);
        setFormData({ sku: '', litrosPorTambor: '' });
        setSaveResult({ success: true, message: 'Aceite actualizado correctamente' });
        setTimeout(() => setSaveResult(null), 3000);
      },
      onError: (error) => {
        console.error('Error al actualizar aceite:', error);
        setSaveResult({ success: false, message: `Error al actualizar: ${formatError(error)}` });
        setTimeout(() => setSaveResult(null), 5000);
      },
    }
  );

  // Mutación para eliminar un aceite
  const deleteAceiteMutation = useMutation(
    (id) => aceitesAPI.deleteAceite(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('aceites');
        setSaveResult({ success: true, message: 'Aceite eliminado correctamente' });
        setTimeout(() => setSaveResult(null), 3000);
      },
      onError: (error) => {
        console.error('Error al eliminar aceite:', error);
        setSaveResult({ success: false, message: `Error al eliminar: ${formatError(error)}` });
        setTimeout(() => setSaveResult(null), 5000);
      },
    }
  );

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.sku.trim()) {
      setSaveResult({ success: false, message: 'El SKU es obligatorio' });
      setTimeout(() => setSaveResult(null), 3000);
      return;
    }

    const litros = parseFloat(formData.litrosPorTambor);
    if (isNaN(litros) || litros <= 0) {
      setSaveResult({ success: false, message: 'Los litros por tambor deben ser un número mayor a 0' });
      setTimeout(() => setSaveResult(null), 3000);
      return;
    }

    if (editingId) {
      updateAceiteMutation.mutate({ 
        id: editingId, 
        data: { 
          sku: formData.sku.trim(), 
          litrosPorTambor: litros 
        } 
      });
    } else {
      createAceiteMutation.mutate({ 
        sku: formData.sku.trim(), 
        litrosPorTambor: litros 
      });
    }
  };

  const handleEdit = (aceite) => {
    setEditingId(aceite._id);
    setFormData({
      sku: aceite.sku,
      litrosPorTambor: aceite.litrosPorTambor.toString()
    });
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este aceite?')) {
      deleteAceiteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ sku: '', litrosPorTambor: '' });
  };

  // Componente para mostrar resultado de operaciones
  const SaveResult = () => {
    if (!saveResult) return null;

    return (
      <div className={`p-4 rounded-lg border mb-6 ${
        saveResult.success 
          ? 'bg-green-900/20 border-green-600 text-green-300' 
          : 'bg-red-900/20 border-red-600 text-red-300'
      }`}>
        <div className="flex items-center space-x-2">
          {saveResult.success ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400" />
          )}
          <span className="font-medium">{saveResult.message}</span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-400">Error al cargar los datos de aceites</p>
        <p className="text-slate-400 text-sm mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Listado de Aceites</h1>
          <p className="text-slate-400 mt-1">
            Gestión de SKU y litros por tambor de aceites
          </p>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <DropletsIcon className="w-6 h-6" />
        </div>
      </div>

      {/* Resultado de operaciones */}
      <SaveResult />

      {/* Botón para agregar nuevo aceite */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Aceite</span>
        </button>
      </div>

      {/* Formulario para agregar/editar aceite */}
      {isAdding && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Editar Aceite' : 'Nuevo Aceite'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  SKU *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className="input w-full"
                  placeholder="Ingrese el SKU del aceite"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Litros por Tambor *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.litrosPorTambor}
                  onChange={(e) => handleInputChange('litrosPorTambor', e.target.value)}
                  className="input w-full"
                  placeholder="Ej: 20.0"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancelar</span>
              </button>
              
              <button
                type="submit"
                disabled={createAceiteMutation.isLoading || updateAceiteMutation.isLoading}
                className="btn btn-primary flex items-center space-x-2"
              >
                {(createAceiteMutation.isLoading || updateAceiteMutation.isLoading) ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{editingId ? 'Actualizar' : 'Guardar'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de aceites */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Aceites Registrados</h3>
        
        {aceites && aceites.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">SKU</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Litros por Tambor</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {aceites.map((aceite) => (
                  <tr key={aceite._id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-white font-medium">{aceite.sku}</td>
                    <td className="py-3 px-4 text-slate-300">{aceite.litrosPorTambor} L</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(aceite)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(aceite._id)}
                          disabled={deleteAceiteMutation.isLoading}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          {deleteAceiteMutation.isLoading ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <DropletsIcon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No hay aceites registrados</p>
            <p className="text-slate-500 text-sm mt-2">Haga clic en "Agregar Aceite" para comenzar</p>
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="card p-6 bg-blue-900/20 border-blue-600">
        <h3 className="text-lg font-semibold text-blue-300 mb-3">ℹ️ Información</h3>
        <div className="space-y-2 text-sm text-blue-200">
          <p>• Los datos de aceites se guardan de forma persistente en la base de datos</p>
          <p>• El SKU debe ser único para cada aceite</p>
          <p>• Los litros por tambor se pueden especificar con decimales (ej: 20.5)</p>
          <p>• Esta información se puede utilizar en presupuestos y reportes</p>
        </div>
      </div>
    </div>
  );
};

export default ListadoAceites;


















