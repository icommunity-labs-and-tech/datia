'use client';

import ImageDisplay from './ImageDisplay';

interface ImageColumnProps {
  imageUrl?: string;
  alt: string;
}

export default function ImageColumn({ imageUrl, alt }: ImageColumnProps) {
  return (
    <ImageDisplay 
      imageUrl={imageUrl} 
      alt={alt}
    />
  );
}
