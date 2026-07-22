'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Form, Alert } from '@/components/legacy/bootstrap-compat';
import Box from '@/components/Box';
import BoxTitle from '@/components/BoxTitle';
import LoadingOverlay from '@/components/Loading';
import { getState, updateState } from '@/actions/states';
import { getItems } from '@/actions/items';
import { getAllStatusTypes } from '@/actions/statusTypes';

export default function EditStatePage() {
  const router = useRouter();
  const { id } = useParams();
  const stateId = id as string;
  const [state, setState] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [statusTypes, setStatusTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    itemId: '',
    statusTypeId: '',
    evidenceID: '',
    backed: false,
    description: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [stateData, itemsData, statusTypesData] = await Promise.all([
          getState(stateId),
          getItems(),
          getAllStatusTypes()
        ]);
        
        setState(stateData);
        setItems(itemsData);
        setStatusTypes(statusTypesData);
        setFormData({
          itemId: stateData?.itemId ?? '',
          statusTypeId: stateData?.statusTypeId ?? '',
          evidenceID: stateData?.evidenceID || '',
          backed: Boolean(stateData?.backed),
          description: stateData?.description || ''
        });
      } catch (err) {
        setError('Error al cargar los datos');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (stateId) {
      loadData();
    }
  }, [stateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await updateState(stateId, formData);
      router.push(`/dashboard/states/${stateId}`);
    } catch (err) {
      setError('Error al actualizar el estado');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) return <LoadingOverlay />;

  return (
    <>
      <Box>
        <BoxTitle message="Editar Estado" />
        
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Item</Form.Label>
            <Form.Select
              value={formData.itemId}
              onChange={(e) => handleChange('itemId', e.target.value)}
              required
            >
              <option value="">Seleccionar item</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.code})
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Tipo de Estado</Form.Label>
            <Form.Select
              value={formData.statusTypeId}
              onChange={(e) => handleChange('statusTypeId', e.target.value)}
              required
            >
              <option value="">Seleccionar tipo de estado</option>
              {statusTypes.map(statusType => (
                <option key={statusType.id} value={statusType.id}>
                  {statusType.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>ID de Evidencia</Form.Label>
            <Form.Control
              type="text"
              value={formData.evidenceID}
              onChange={(e) => handleChange('evidenceID', e.target.value)}
              placeholder="ID de evidencia"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Respaldado"
              checked={formData.backed}
              onChange={(e) => handleChange('backed', e.target.checked)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descripción del estado"
            />
          </Form.Group>

          <div className="d-flex gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => router.push(`/dashboard/states/${stateId}`)}
            >
              Cancelar
            </Button>
          </div>
        </Form>
      </Box>
    </>
  );
}
