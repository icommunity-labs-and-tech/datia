'use client';

import { ThemeIcon } from '@mantine/core';
import { IconRosetteDiscountCheckFilled } from '@tabler/icons-react';

interface VerifiedBadgeProps {
  title?: string;
  size?: 'sm' | 'md';
}

export function VerifiedBadge({ title, size = 'md' }: VerifiedBadgeProps) {
  const px = size === 'sm' ? 16 : 20;

  return (
    <ThemeIcon
      variant="transparent"
      color="green"
      size={px}
      aria-label={title}
      title={title}
      style={{ flexShrink: 0 }}
    >
      <IconRosetteDiscountCheckFilled size={px} />
    </ThemeIcon>
  );
}
