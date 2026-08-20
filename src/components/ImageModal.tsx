'use client';

import { Modal, ActionIcon, Center, Loader, Stack, Text, Group } from '@mantine/core';
import { useState, useEffect } from 'react';
import { IconPhoto, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

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
    <Modal
      opened={show}
      onClose={onHide}
      size="xl"
      centered
      title={
        <Group gap={6}>
          <IconPhoto size={17} stroke={1.7} />
          {title || 'Imagen'}
          {isGallery && (
            <Text component="span" size="sm" c="dimmed" fw={400}>
              {activeIndex + 1} / {total}
            </Text>
          )}
        </Group>
      }
    >
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, background: 'var(--mantine-color-default-hover)', borderRadius: 6 }}>
        {isLoading && (
          <Center style={{ minHeight: 400 }}>
            <Loader aria-label="Cargando imagen..." />
          </Center>
        )}

        {hasError ? (
          <Stack align="center" gap="xs" c="dimmed" style={{ minHeight: 400, justifyContent: 'center' }}>
            <IconPhoto size={48} stroke={1.4} />
            <Text c="dimmed">Error al cargar la imagen</Text>
          </Stack>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt={alt}
            style={{
              maxHeight: '70vh',
              maxWidth: '100%',
              width: 'auto',
              display: isLoading ? 'none' : 'block',
              borderRadius: 6,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              margin: 'auto',
            }}
            onLoad={() => setIsLoading(false)}
            onError={() => { setIsLoading(false); setHasError(true); }}
          />
        )}

        {/* Prev button */}
        {isGallery && onNavigate && activeIndex > 0 && (
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => onNavigate(activeIndex - 1)}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.85 }}
            aria-label="Anterior"
          >
            <IconChevronLeft size={18} stroke={1.8} />
          </ActionIcon>
        )}

        {/* Next button */}
        {isGallery && onNavigate && activeIndex < total - 1 && (
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => onNavigate(activeIndex + 1)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.85 }}
            aria-label="Siguiente"
          >
            <IconChevronRight size={18} stroke={1.8} />
          </ActionIcon>
        )}
      </div>
    </Modal>
  );
}
