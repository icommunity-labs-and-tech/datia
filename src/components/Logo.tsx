'use client';

import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  /** Pass null to render the mark without a link. */
  href?: string | null;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  src?: string;
  alt?: string;
}

export default function Logo({
  href = '/dashboard',
  width = 120,
  height = 40,
  className = '',
  priority = false,
  src,
  alt,
}: LogoProps) {
  const resolvedSrc = src || '/logo.webp';
  const resolvedAlt = alt || 'Logo';

  const logoElement = (
    <Image
      src={resolvedSrc}
      alt={resolvedAlt}
      width={width}
      height={height}
      style={{ objectFit: 'contain', maxWidth: '100%' }}
      priority={priority}
      className={className}
      unoptimized={!!src}
    />
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        {logoElement}
      </Link>
    );
  }

  return logoElement;
}
