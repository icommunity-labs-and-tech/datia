import React from 'react';
import { Image } from 'react-bootstrap';
import { useState } from 'react';
import ImageModal from './ImageModal';

interface ImageDisplayProps {
  imageUrl?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  clickable?: boolean;
  modalTitle?: string;
}

export default function ImageDisplay({ 
  imageUrl, 
  alt = "Imagen", 
  className = "",
  style = {},
  clickable = false,
  modalTitle
}: ImageDisplayProps) {
  const [showModal, setShowModal] = useState(false);

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickable && imageUrl) {
      setShowModal(true);
    }
  };
  if (!imageUrl) {
    return (
      <div 
        className={`d-flex align-items-center justify-content-center bg-light border rounded ${className}`}
        style={{ width: '60px', height: '60px', ...style }}
      >
        <small className="text-muted">Sin imagen</small>
      </div>
    );
  }

  return (
    <>
      <div
        className={`${clickable ? 'cursor-pointer' : ''}`}
        style={{ 
          cursor: clickable ? 'pointer' : 'default',
          display: 'inline-block'
        }}
        onClick={handleImageClick}
        data-image-clickable={clickable ? 'true' : undefined}
      >
        <Image
          src={imageUrl}
          alt={alt}
          fluid
          className={`border rounded ${className}`}
          style={{ 
            maxWidth: '60px', 
            maxHeight: '60px', 
            objectFit: 'cover',
            ...style 
          }}
        />
      </div>
      
      {clickable && imageUrl && (
        <ImageModal
          show={showModal}
          onHide={() => setShowModal(false)}
          imageUrl={imageUrl}
          alt={alt}
          title={modalTitle}
        />
      )}
    </>
  );
}
