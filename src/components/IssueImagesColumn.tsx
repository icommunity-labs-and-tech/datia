'use client';

import MultipleImageDisplay from './MultipleImageDisplay';

interface IssueImagesColumnProps {
  issue: any;
}

export default function IssueImagesColumn({ issue }: IssueImagesColumnProps) {
  const imageUrls = issue.imageUrls as string[] || [];
  return (
    <MultipleImageDisplay 
      imageUrls={imageUrls} 
      alt={`Imágenes de incidencia ${issue.title}`}
    />
  );
}
