import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook para manejar el estado de páginas de edición
 */
export const useEditPage = <T>(
  id: string,
  getData: (id: string) => Promise<T>,
  updateData: (id: string, data: Partial<T>) => Promise<void>,
  redirectPath: (id: string) => string
) => {
  const router = useRouter();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await getData(id);
        setData(result);
      } catch (err) {
        setError('Error al cargar los datos');
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id, getData]);

  const handleSubmit = async (formData: Partial<T>) => {
    setIsSaving(true);
    setError(null);
    try {
      await updateData(id, formData);
      router.push(redirectPath(id));
    } catch (err) {
      setError('Error al actualizar');
      console.error('Error updating data:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return { 
    data, 
    isLoading, 
    isSaving, 
    error, 
    handleSubmit,
    setError 
  };
};
