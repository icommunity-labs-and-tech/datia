'use client';

import React, { useState, useRef } from 'react';
import { Form, Button, Image, Alert, Row, Col } from 'react-bootstrap';
// import { uploadImage } from '@/actions/upload';

interface MultipleImageUploadProps {
  currentImageUrls?: string[];
  onImageUrlsChange: (imageUrls: string[]) => void;
  uploadType: 'product' | 'item' | 'issue';
  className?: string;
  maxImages?: number;
}

export default function MultipleImageUpload({ 
  currentImageUrls = [], 
  onImageUrlsChange, 
  uploadType,
  className = '',
  maxImages = 5
}: MultipleImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    // Validar número máximo de imágenes
    if (currentImageUrls.length >= maxImages) {
      setError(`No puedes subir más de ${maxImages} imágenes`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', uploadType);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error al subir la imagen');
      }

      const result = await response.json();
      const newImageUrls = [...currentImageUrls, result.imageUrl];
      onImageUrlsChange(newImageUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const newImageUrls = currentImageUrls.filter((_, index) => index !== indexToRemove);
    onImageUrlsChange(newImageUrls);
  };

  const handleRemoveAllImages = () => {
    onImageUrlsChange([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <Form.Group controlId="multipleImageUpload">
        <Form.Label>Imágenes {uploadType === 'issue' ? '(múltiples)' : ''}</Form.Label>
        
        {currentImageUrls.length > 0 && (
          <Row className="mb-3">
            {currentImageUrls.map((imageUrl, index) => (
              <Col key={index} xs={6} md={4} lg={3} className="mb-2">
                <div className="position-relative">
                  <Image
                    src={imageUrl}
                    alt={`Imagen ${index + 1}`}
                    fluid
                    className="border rounded"
                    style={{ height: '120px', objectFit: 'cover' }}
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    className="position-absolute top-0 end-0"
                    style={{ margin: '2px' }}
                    onClick={() => handleRemoveImage(index)}
                  >
                    ×
                  </Button>
                </div>
              </Col>
            ))}
          </Row>
        )}

        <div className="d-flex gap-2 mb-3">
          <Form.Control
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading || currentImageUrls.length >= maxImages}
          />
          {currentImageUrls.length > 0 && (
            <Button 
              variant="outline-danger" 
              onClick={handleRemoveAllImages}
              disabled={isUploading}
            >
              Eliminar todas
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
          Formatos soportados: JPG, PNG, GIF. Tamaño máximo: 5MB por imagen.
          {uploadType === 'issue' && ` Máximo ${maxImages} imágenes.`}
        </Form.Text>
      </Form.Group>
    </div>
  );
}
