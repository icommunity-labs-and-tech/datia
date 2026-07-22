'use client';

import dynamic from 'next/dynamic';
import { Center, Loader, Stack, Text } from '@mantine/core';
import type { GeolocationCoordinates } from '@/lib/geolocation/types';

interface GeolocationMapProps {
  value?: GeolocationCoordinates;
  onChange?: (coords: GeolocationCoordinates) => void;
  required?: boolean;
  readOnly?: boolean;
  label?: string;
}

// Cargar el componente del mapa solo en el cliente
const GeolocationMapInternal = dynamic(
  () => import('./GeolocationMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="geolocation-map-container">
        <Center style={{ height: 350, border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
          <Stack align="center" gap="xs">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Cargando mapa...</Text>
          </Stack>
        </Center>
      </div>
    )
  }
);

export default function GeolocationMap(props: GeolocationMapProps) {
  return <GeolocationMapInternal {...props} />;
}

