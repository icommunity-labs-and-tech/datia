'use client';

import dynamic from 'next/dynamic';
import { Center, Loader, Stack, Text } from '@mantine/core';

interface StateWithLocation {
  id: string;
  title: string;
  description?: string;
  createdAt?: Date | string;
  templateConfig?: any;
  statusType?: {
    name: string;
  };
}

interface ItemStatesMapProps {
  states: StateWithLocation[];
}

// Cargar el componente del mapa solo en el cliente
const ItemStatesMapInternal = dynamic(
  () => import('./ItemStatesMap'),
  {
    ssr: false,
    loading: () => (
      <Center style={{ height: 500, border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
        <Stack align="center" gap="xs">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">Cargando mapa...</Text>
        </Stack>
      </Center>
    )
  }
);

export default function ItemStatesMap(props: ItemStatesMapProps) {
  return <ItemStatesMapInternal {...props} />;
}
