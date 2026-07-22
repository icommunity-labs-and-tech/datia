'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { LeafletMapConfig } from '@/lib/geolocation/maps';
import type { EnergySourceRecord, EnergyCarrier } from '@/domain/energy/EnergyTypes';
import { Text, Badge, Stack, Group } from '@mantine/core';
import { useTranslations } from 'next-intl';

// Fix Leaflet icons in Next.js
if (typeof window !== 'undefined') {
  try {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  } catch {}
}

const CARRIER_COLORS: Record<EnergyCarrier, string> = {
  ELECTRICITY: '#1752CC',
  NATURAL_GAS: '#f76707',
  HYDROGEN: '#7950f2',
  SOLAR_THERMAL: '#f59f00',
  DISTRICT_HEATING: '#e64980',
  DISTRICT_COOLING: '#1098ad',
  BIOMASS: '#2f9e44',
  OIL: '#5c3317',
  COAL: '#495057',
  OTHER: '#868e96',
};

function makeCarrierIcon(carrier: EnergyCarrier) {
  const color = CARRIER_COLORS[carrier] ?? '#868e96';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:${color};
      border:2.5px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}

interface EnergySourcesGlobalMapProps {
  sources: EnergySourceRecord[];
  height?: number | string;
  onSourceClick?: (source: EnergySourceRecord) => void;
}

export default function EnergySourcesGlobalMap({
  sources,
  height = 400,
  onSourceClick,
}: EnergySourcesGlobalMapProps) {
  const t = useTranslations('energyHub');
  const mappedSources = useMemo(
    () => sources.filter((s) => s.latitude != null && s.longitude != null),
    [sources]
  );

  return (
    <div style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer
        center={[LeafletMapConfig.defaultCenter.lat, LeafletMapConfig.defaultCenter.lng]}
        zoom={LeafletMapConfig.defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution={LeafletMapConfig.tileLayerAttribution}
          url={LeafletMapConfig.tileLayerUrl}
        />

        {mappedSources.map((source) => (
          <Marker
            key={source.id}
            position={[source.latitude!, source.longitude!]}
            icon={makeCarrierIcon(source.energyCarrier)}
            eventHandlers={onSourceClick ? { click: () => onSourceClick(source) } : {}}
          >
            <Popup>
              <Stack gap={4} style={{ minWidth: 180 }}>
                <Text fw={600} size="sm">{source.name}</Text>
                <Group gap={4}>
                  <Badge
                    size="xs"
                    style={{ background: CARRIER_COLORS[source.energyCarrier], color: '#fff' }}
                  >
                    {t(`carriers.${source.energyCarrier}`)}
                  </Badge>
                  {source.renewableShare != null && (
                    <Badge size="xs" color="green" variant="light">
                      {t('mapPopup.renewable', { share: source.renewableShare })}
                    </Badge>
                  )}
                </Group>
                {source.capacityKw != null && (
                  <Text size="xs" c="dimmed">{source.capacityKw} kW</Text>
                )}
                {source.location && (
                  <Text size="xs" c="dimmed">{source.location}</Text>
                )}
              </Stack>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export { CARRIER_COLORS };
