'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Form, Alert } from 'react-bootstrap';
import Box from '@/components/Box';
import BoxTitle from '@/components/BoxTitle';
import LoadingOverlay from '@/components/Loading';
import { getUserById, updateUser } from '@/actions/users';

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams();
  const userId = id as string;
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'ADMIN' as const,
    phone: '',
    notes: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const result = await getUserById(userId);
        if (result.success && result.user) {
          setUser(result.user);
          setFormData({
            name: result.user.name || '',
            email: result.user.email,
            role: 'ADMIN',
            phone: result.user.phone || '',
            notes: result.user.notes || ''
          });
        } else {
          setError(result.error || 'Error al cargar el usuario');
        }
      } catch (err) {
        setError('Error al cargar el usuario');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      loadUser();
    }
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append('name', formData.name);
      formDataObj.append('email', formData.email);
      formDataObj.append('role', formData.role);
      formDataObj.append('phone', formData.phone || '');
      formDataObj.append('notes', formData.notes || '');

      const result = await updateUser(userId, formDataObj);
      if (result.success) {
        router.push(`/dashboard/users/${userId}`);
      } else {
        setError(result.error || 'Error al actualizar el usuario');
      }
    } catch (err) {
      setError('Error al actualizar el usuario');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) return <LoadingOverlay />;

  return (
    <>
      <Box>
        <BoxTitle message="Editar Usuario" />

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              placeholder="Nombre del usuario"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              placeholder="Email del usuario"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Rol</Form.Label>
            <Form.Select
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              required
            >
              <option value="ADMIN">Administrador</option>
            </Form.Select>
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
              onClick={() => router.push(`/dashboard/users/${userId}`)}
            >
              Cancelar
            </Button>
          </div>
        </Form>
      </Box>
    </>
  );
}
