import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteEntityOptions {
  entityName: string;
  redirectPath: string;
  // Devuelve la entidad eliminada para que el consumidor pueda actualizar su estado local
  onSuccess?: (deletedEntity?: any) => void;
  onError?: (error: any) => void;
}

interface DeleteEntityState {
  showDeleteModal: boolean;
  entityToDelete: any;
  isDeleting: boolean;
}

export function useDeleteEntity<T = any>(
  deleteFunction: (id: string, ...args: any[]) => Promise<{ success: boolean; message: string }>,
  options: DeleteEntityOptions
) {
  const router = useRouter();
  const [state, setState] = useState<DeleteEntityState>({
    showDeleteModal: false,
    entityToDelete: null,
    isDeleting: false,
  });

  const openDeleteModal = (entity: T) => {
    setState(prev => ({
      ...prev,
      entityToDelete: entity,
      showDeleteModal: true,
    }));
  };

  const closeDeleteModal = () => {
    setState(prev => ({
      ...prev,
      showDeleteModal: false,
      entityToDelete: null,
    }));
  };

  const handleDelete = async (...args: any[]) => {
    if (!state.entityToDelete) return;
    
    setState(prev => ({ ...prev, isDeleting: true }));
    const entityBeingDeleted = state.entityToDelete;
    
    try {
      const result = await deleteFunction(entityBeingDeleted.id, ...args);
      
      if (result.success) {
        // Notificar al consumidor con la entidad eliminada ANTES de limpiar el estado
        options.onSuccess?.(entityBeingDeleted);
        
        // Redirigir si se especifica un path
        if (options.redirectPath) {
          router.push(options.redirectPath);
        }
        
        closeDeleteModal();
      }
    } catch (error) {
      console.error(`Error eliminando ${options.entityName}:`, error);
      options.onError?.(error);
    } finally {
      setState(prev => ({ ...prev, isDeleting: false }));
    }
  };

  return {
    ...state,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
  };
}
