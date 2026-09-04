'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LeafletMapConfig } from '@/lib/geolocation/maps';
import type { Installation, Located } from '@/lib/map/installations';

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

/**
 * A marker sized by how many assets the installation holds, so the map reads at
 * a glance: a site with forty panels should not look like one holding a spare
 * battery.
 */
function makeInstallationIcon(count: number, selected: boolean) {
  const size = Math.min(52, 26 + Math.round(Math.log2(count + 1) * 7));
  const bg = selected ? '#1c4ed8' : '#2563eb';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${bg};
      border:${selected ? 4 : 2.5}px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      color:white;font-weight:600;font-size:${size > 38 ? 14 : 12}px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Keeps every installation in view, and follows the selection when it changes. */
function Frame({ bounds, focus }: { bounds: L.LatLngBoundsExpression | null; focus: [number, number] | null }) {
  const map = useMap();

  useMemo(() => {
    if (focus) {
      map.setView(focus, Math.max(map.getZoom(), 13), { animate: true });
    } else if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [map, bounds, focus]);

  return null;
}

interface InstallationsMapProps<T extends Located> {
  installations: Array<Installation<T>>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  height?: number | string;
}

export default function InstallationsMap<T extends Located>({
  installations,
  selectedId,
  onSelect,
  height = 420,
}: InstallationsMapProps<T>) {
  const bounds = useMemo(() => {
    if (!installations.length) return null;
    return L.latLngBounds(installations.map((i) => [i.lat, i.lng] as [number, number]));
  }, [installations]);

  const focus = useMemo(() => {
    const hit = installations.find((i) => i.id === selectedId);
    return hit ? ([hit.lat, hit.lng] as [number, number]) : null;
  }, [installations, selectedId]);

  return (
    <MapContainer
      center={[LeafletMapConfig.defaultCenter.lat, LeafletMapConfig.defaultCenter.lng]}
      zoom={LeafletMapConfig.defaultZoom}
      style={{ height, width: '100%', borderRadius: 8 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url={LeafletMapConfig.tileLayerUrl}
        attribution={LeafletMapConfig.tileLayerAttribution}
      />
      <Frame bounds={bounds} focus={focus} />
      {installations.map((installation) => (
        <Marker
          key={installation.id}
          position={[installation.lat, installation.lng]}
          icon={makeInstallationIcon(installation.members.length, installation.id === selectedId)}
          eventHandlers={{
            // Clicking the selected one again clears it, so the map is a filter
            // you can step out of without hunting for a reset button.
            click: () => onSelect(installation.id === selectedId ? null : installation.id),
          }}
        />
      ))}
    </MapContainer>
  );
}
