'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@mantine/core';

// Leaflet touches `window` on import, so the picker only loads in the browser.
const LocationPicker = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => <Skeleton height={240} radius="md" />,
});

export default LocationPicker;
export type { Point } from './LocationPicker';
