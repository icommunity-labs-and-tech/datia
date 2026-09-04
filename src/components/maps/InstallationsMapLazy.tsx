'use client';

import dynamic from 'next/dynamic';
import { Center, Loader } from '@mantine/core';
import type { Installation, Located } from '@/lib/map/installations';

// Leaflet touches `window` on import, so the map only loads in the browser.
const InstallationsMap = dynamic(() => import('./InstallationsMap'), {
  ssr: false,
  loading: () => (
    <Center h={420}>
      <Loader size="sm" />
    </Center>
  ),
});

export default function InstallationsMapLazy<T extends Located>(props: {
  installations: Array<Installation<T>>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  height?: number | string;
}) {
  return <InstallationsMap {...props} />;
}
