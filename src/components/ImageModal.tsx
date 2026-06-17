'use client';

import { Modal, Button } from 'react-bootstrap';
import { useState, useEffect } from 'react';

interface ImageModalProps {
  show: boolean;
  onHide: () => void;
  imageUrl?: string;
  alt: string;
  title?: string;
  // Gallery mode (optional)
  imageUrls?: string[];
  activeIndex?: number;
  onNavigate?: (index: number) => void;
}

export default function ImageModal({ show, onHide, imageUrl, alt, title, imageUrls, activeIndex = 0, onNavigate }: ImageModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isGallery = imageUrls && imageUrls.length > 1;
  const currentUrl = isGallery ? imageUrls[activeIndex] : (imageUrl ?? '');
  const total = isGallery ? imageUrls.length : 1;

  useEffect(() => {
    if (show && currentUrl) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [show, currentUrl]);

  // Keyboard navigation
  useEffect(() => {
    if (!show || !isGallery || !onNavigate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && activeIndex > 0) onNavigate(activeIndex - 1);
      if (e.key === 'ArrowRight' && activeIndex < total - 1) onNavigate(activeIndex + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, isGallery, activeIndex, total, onNavigate]);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="image-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-image me-2" />
          {title || 'Imagen'}
          {isGallery && (
            <span className="text-muted fs-6 fw-normal ms-2">
              {activeIndex + 1} / {total}
            </span>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0 d-flex justify-content-center align-items-center position-relative">
        {isLoading && (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando imagen...</span>
            </div>
          </div>
        )}

        {hasError ? (
          <div className="d-flex flex-column justify-content-center align-items-center text-muted" style={{ minHeight: '400px' }}>
            <i className="bi bi-image" style={{ fontSize: '3rem' }} />
            <p className="mt-2 mb-0">Error al cargar la imagen</p>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt={alt}
            className="img-fluid"
            style={{ maxHeight: '70vh', width: 'auto', display: isLoading ? 'none' : 'block' }}
            onLoad={() => setIsLoading(false)}
            onError={() => { setIsLoading(false); setHasError(true); }}
          />
        )}

        {/* Prev button */}
        {isGallery && onNavigate && activeIndex > 0 && (
          <Button
            variant="light"
            size="sm"
            onClick={() => onNavigate(activeIndex - 1)}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.85 }}
          >
            <i className="bi bi-chevron-left" />
          </Button>
        )}

        {/* Next button */}
        {isGallery && onNavigate && activeIndex < total - 1 && (
          <Button
            variant="light"
            size="sm"
            onClick={() => onNavigate(activeIndex + 1)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.85 }}
          >
            <i className="bi bi-chevron-right" />
          </Button>
        )}
      </Modal.Body>

      <style jsx>{`
        .image-modal .modal-dialog {
          max-width: 90vw;
        }
        .image-modal .modal-body {
          background-color: #f8f9fa;
          border-radius: 0 0 0.375rem 0.375rem;
          min-height: 400px;
        }
        .image-modal img {
          border-radius: 0.375rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin: auto;
        }
      `}</style>
    </Modal>
  );
}
