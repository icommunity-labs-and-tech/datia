'use client';

import ImageDisplay from './ImageDisplay';

interface ItemImageColumnProps {
  item: any;
}

export default function ItemImageColumn({ item }: ItemImageColumnProps) {
  return (
    <ImageDisplay 
      imageUrl={item.imageUrl} 
      alt={`Imagen de ${item.name}`}
      clickable={true}
      modalTitle={`Imagen de ${item.name}`}
    />
  );
}
