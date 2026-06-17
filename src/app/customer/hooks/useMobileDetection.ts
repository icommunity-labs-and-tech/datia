'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile layout based on viewport width
 * @param breakpoint - The max-width breakpoint in pixels (default: 768)
 * @returns boolean indicating if the viewport is mobile-sized
 */
export function useMobileDetection(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(
        typeof window !== 'undefined' &&
        window.matchMedia(`(max-width: ${breakpoint}px)`).matches
      );
    };

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}
