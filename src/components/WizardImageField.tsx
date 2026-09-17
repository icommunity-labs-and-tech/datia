'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Form, Button, Image, Alert, Row, Col } from '@/components/legacy/bootstrap-compat';
import { uploadImage } from '@/actions/upload';

interface WizardImageFieldProps {
  name: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  uploadType: 'product' | 'item';
  required?: boolean;
  compact?: boolean; // Nueva prop para layout compacto
}

export default function WizardImageField({
  name,
  label,
  value,
  onChange,
  uploadType,
  required = false,
  compact = true
}: WizardImageFieldProps) {
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

  if (compact) {
    return (
      <Form.Group className="mb-3" controlId={name}>
        <Form.Label>
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </Form.Label>
        
        <Row className="align-items-center">
          <Col md={4}>
            {value && (
              <div className="text-center">
                <Image
                  src={value}
                  alt={label}
                  fluid
                  style={{ 
                    maxHeight: '80px', 
                    maxWidth: '120px',
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
                  className="border shadow-sm"
                />
              </div>
            )}
          </Col>
          
          <Col md={8}>
            <div className="d-flex flex-column gap-2">
              <Form.Control
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                size="sm"
                className="form-control-sm"
              />
              
              {!value && (
                <small className="text-muted">
                  Selecciona una imagen (máx. 5MB)
                </small>
              )}
              
              {value && (
                <div className="d-flex align-items-center justify-content-between">
                  <small className="text-success">
                    ✓ Imagen cargada correctamente
                  </small>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={isUploading}
                    style={{ 
                      fontSize: '12px',
                      padding: '2px 8px',
                      minWidth: 'auto'
                    }}
                  >
                    <i className="bi bi-trash me-1"></i>
                    Eliminar
                  </Button>
                </div>
              )}
            </div>
          </Col>
        </Row>

        {isUploading && (
          <Alert variant="info" className="mt-2 mb-0 py-2">
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              Subiendo imagen...
            </div>
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mt-2 mb-0 py-2">
            <small>{error}</small>
          </Alert>
        )}
      </Form.Group>
    );
  }

  // Layout tradicional (para compatibilidad)
  return (
    <Form.Group className="mb-3" controlId={name}>
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
