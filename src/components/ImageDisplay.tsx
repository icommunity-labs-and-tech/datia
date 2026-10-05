import React from 'react';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Center, Text } from '@mantine/core';
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
  const t = useTranslations('itemDetail');

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickable && imageUrl) {
      setShowModal(true);
    }
  };
  if (!imageUrl) {
    return (
      <Center
        className={className}
        style={{ width: 60, height: 60, borderRadius: 'var(--mantine-radius-sm)', border: '1px solid var(--mantine-color-gray-2)', background: 'var(--mantine-color-gray-0)', ...style }}
      >
        <Text size="xs" c="dimmed">{t('noImage')}</Text>
      </Center>
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          className={className}
          style={{
            maxWidth: '60px',
            maxHeight: '60px',
            width: '100%',
            objectFit: 'cover',
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 6,
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
