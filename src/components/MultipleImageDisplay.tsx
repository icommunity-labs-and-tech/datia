import React from 'react';
import { Image, Row, Col } from 'react-bootstrap';

interface MultipleImageDisplayProps {
  imageUrls?: string[];
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  maxDisplay?: number;
}

export default function MultipleImageDisplay({ 
  imageUrls = [], 
  alt = "Imágenes", 
  className = "",
  style = {},
  maxDisplay = 3
}: MultipleImageDisplayProps) {
  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div 
        className={`d-flex align-items-center justify-content-center bg-light border rounded ${className}`}
        style={{ width: '60px', height: '60px', ...style }}
      >
        <small className="text-muted">Sin imágenes</small>
      </div>
    );
  }

  const displayUrls = imageUrls.slice(0, maxDisplay);
  const remainingCount = imageUrls.length - maxDisplay;

  return (
    <div className={className} style={style}>
      <Row className="g-1">
        {displayUrls.map((imageUrl, index) => (
          <Col key={index} xs={4}>
            <Image
              src={imageUrl}
              alt={`${alt} ${index + 1}`}
              fluid
              className="border rounded"
              style={{ 
                width: '100%', 
                height: '20px', 
                objectFit: 'cover',
                fontSize: '8px'
              }}
            />
          </Col>
        ))}
        {remainingCount > 0 && (
          <Col xs={4}>
            <div 
              className="d-flex align-items-center justify-content-center bg-secondary text-white border rounded"
              style={{ height: '20px', fontSize: '8px' }}
            >
              +{remainingCount}
            </div>
          </Col>
        )}
      </Row>
    </div>
  );
}
