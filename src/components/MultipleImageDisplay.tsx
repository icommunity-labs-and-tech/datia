import React from 'react';
import { SimpleGrid, Center, Text } from '@mantine/core';

interface MultipleImageDisplayProps {
  imageUrls?: string[];
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  maxDisplay?: number;
}

const cellBorder = {
  border: '1px solid var(--mantine-color-default-border)',
  borderRadius: 4,
};

export default function MultipleImageDisplay({
  imageUrls = [],
  alt = "Imágenes",
  className = "",
  style = {},
  maxDisplay = 3
}: MultipleImageDisplayProps) {
  if (!imageUrls || imageUrls.length === 0) {
    return (
      <Center
        className={className}
        style={{ width: 60, height: 60, background: 'var(--mantine-color-default-hover)', ...cellBorder, ...style }}
      >
        <Text size="xs" c="dimmed">Sin imágenes</Text>
      </Center>
    );
  }

  const displayUrls = imageUrls.slice(0, maxDisplay);
  const remainingCount = imageUrls.length - maxDisplay;

  return (
    <div className={className} style={style}>
      <SimpleGrid cols={3} spacing={4}>
        {displayUrls.map((imageUrl, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={index}
            src={imageUrl}
            alt={`${alt} ${index + 1}`}
            style={{ width: '100%', height: 20, objectFit: 'cover', ...cellBorder }}
          />
        ))}
        {remainingCount > 0 && (
          <Center style={{ height: 20, background: 'var(--mantine-color-gray-6)', color: '#fff', fontSize: 8, ...cellBorder }}>
            +{remainingCount}
          </Center>
        )}
      </SimpleGrid>
    </div>
  );
}
