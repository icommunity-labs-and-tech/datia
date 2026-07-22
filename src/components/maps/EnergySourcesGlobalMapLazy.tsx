'use client';

import dynamic from 'next/dynamic';
import type { EnergySourceRecord } from '@/domain/energy/EnergyTypes';
import { Center, Loader } from '@mantine/core';

const EnergySourcesGlobalMap = dynamic(
  () => import('./EnergySourcesGlobalMap'),
  {
    ssr: false,
    loading: () => (
      <Center h={400}>
        <Loader size="sm" />
      </Center>
    ),
  }
);

export default function EnergySourcesGlobalMapLazy(
  props: { sources: EnergySourceRecord[]; height?: number | string; onSourceClick?: (source: EnergySourceRecord) => void }
) {
  return <EnergySourcesGlobalMap {...props} />;
}
