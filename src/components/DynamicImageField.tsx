'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Form, Button, Image, Alert } from 'react-bootstrap';
import { uploadImage } from '@/actions/upload';

interface DynamicImageFieldProps {
  name: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  uploadType: 'product' | 'item' | 'issue';
  className?: string;
  required?: boolean;
}

export default function DynamicImageField({
  name,
  label,
  value,
  onChange,
  uploadType,
  className = '',
  required = false
}: DynamicImageFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe ser menor a 5MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', uploadType);

      const result = await uploadImage(formData);
      onChange(result.imageUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setIsUploading(false);
    }
  }, [uploadType, onChange]);

  const handleRemoveImage = useCallback(() => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  return (
    <Form.Group className={`mb-3 ${className}`} controlId={name}>
      <Form.Label>
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </Form.Label>
      
      {value && (
        <div className="mb-3">
          <Image
            src={value}
            alt={label}
            fluid
            style={{ maxHeight: '200px', objectFit: 'contain' }}
            className="border rounded"
          />
        </div>
      )}

      <div className="d-flex gap-2 mb-3">
        <Form.Control
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {value && (
          <Button 
            variant="outline-danger" 
            onClick={handleRemoveImage}
            disabled={isUploading}
          >
            Eliminar
          </Button>
        )}
      </div>

      {isUploading && (
        <Alert variant="info">
          Subiendo imagen...
        </Alert>
      )}

      {error && (
        <Alert variant="danger">
          {error}
        </Alert>
      )}

      <Form.Text className="text-muted">
        Formatos soportados: JPG, PNG, GIF. Tamaño máximo: 5MB
      </Form.Text>
    </Form.Group>
  );
}
