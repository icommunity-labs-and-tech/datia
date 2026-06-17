'use client';

import { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useTranslations } from 'next-intl';
import { changePassword } from '@/actions/users';

export default function ChangePasswordForm() {
  const tCommon = useTranslations('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append('currentPassword', formData.currentPassword);
      formDataObj.append('newPassword', formData.newPassword);
      formDataObj.append('confirmPassword', formData.confirmPassword);

      const result = await changePassword(formDataObj);

      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Contraseña actualizada correctamente' });
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al cambiar la contraseña' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error inesperado al cambiar la contraseña' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFormValid = formData.currentPassword && 
                     formData.newPassword && 
                     formData.confirmPassword && 
                     formData.newPassword === formData.confirmPassword &&
                     formData.newPassword.length >= 6;

  return (
    <Form onSubmit={handleSubmit}>
      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'danger'} className="mb-3">
          {message.text}
        </Alert>
      )}

      <Form.Group className="mb-3">
        <Form.Label>Contraseña actual</Form.Label>
        <Form.Control
          type="password"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleInputChange}
          placeholder="Ingresa tu contraseña actual"
          required
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Nueva contraseña</Form.Label>
        <Form.Control
          type="password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleInputChange}
          placeholder="Ingresa tu nueva contraseña"
          required
          minLength={6}
        />
        <Form.Text className="text-muted">
          {tCommon('passwordMinLength')}
        </Form.Text>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Confirmar nueva contraseña</Form.Label>
        <Form.Control
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          placeholder="Confirma tu nueva contraseña"
          required
        />
        {formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
          <Form.Text className="text-danger">
            Las contraseñas no coinciden
          </Form.Text>
        )}
      </Form.Group>

      <Button 
        type="submit" 
        variant="primary" 
        disabled={!isFormValid || isSubmitting}
      >
        {isSubmitting ? 'Cambiando contraseña...' : 'Cambiar contraseña'}
      </Button>
    </Form>
  );
}
