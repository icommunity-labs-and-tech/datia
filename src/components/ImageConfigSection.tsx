'use client';

import React from 'react';
import { Form, Row, Col } from 'react-bootstrap';

interface ImageConfigSectionProps {
  allowMultipleImages: boolean;
  maxImages: number;
  onConfigChange: (config: { allowMultipleImages: boolean; maxImages: number }) => void;
}

export default function ImageConfigSection({
  allowMultipleImages,
  maxImages,
  onConfigChange,
}: ImageConfigSectionProps) {
  const handleAllowMultipleChange = (checked: boolean) => {
    onConfigChange({
      allowMultipleImages: checked,
      maxImages: checked ? maxImages : 1,
    });
  };

  const handleMaxImagesChange = (value: number) => {
    onConfigChange({
      allowMultipleImages,
      maxImages: value,
    });
  };

  return (
    <div className="mb-3">
      <h6 className="mb-3">Configuración de Imágenes</h6>
      
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Permitir múltiples imágenes"
              checked={allowMultipleImages}
              onChange={(e) => handleAllowMultipleChange(e.target.checked)}
            />
            <Form.Text className="text-muted">
              Si está habilitado, se podrán subir varias imágenes para este tipo de incidencia.
            </Form.Text>
          </Form.Group>
        </Col>
        
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Número máximo de imágenes</Form.Label>
            <Form.Select
              value={maxImages}
              onChange={(e) => handleMaxImagesChange(Number(e.target.value))}
              disabled={!allowMultipleImages}
            >
              <option value={1}>1 imagen</option>
              <option value={3}>3 imágenes</option>
              <option value={5}>5 imágenes</option>
              <option value={10}>10 imágenes</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Límite máximo de imágenes que se pueden subir.
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>
    </div>
  );
}
