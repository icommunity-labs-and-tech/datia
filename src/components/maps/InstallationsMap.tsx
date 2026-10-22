'use client';

import { useEffect, useMemo, useReducer } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { LeafletMapConfig } from '@/lib/geolocation/maps';
import type { Installation, Located } from '@/lib/map/installations';

// Fix Leaflet icons in Next.js
if (typeof window !== 'undefined') {
  try {
    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
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

/** One asset, once its installation is zoomed in enough to tell them apart. */
function makeAssetIcon(selected: boolean) {
  const size = selected ? 18 : 16;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${selected ? '#1c4ed8' : '#2563eb'};
      border:${selected ? 3 : 2}px solid white;
      box-shadow:0 1px 5px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * An installation splits into its assets once, at the current zoom, they sit
 * this far apart on screen: closer than that, separate dots would overlap.
 */
const SPLIT_PIXELS = 24;

/**
 * Keeps every installation in view, and frames the selected one's assets —
 * which is what splits it into one dot per asset.
 */
function Frame({ bounds, focus }: { bounds: L.LatLngBounds | null; focus: L.LatLngBounds | null }) {
  const map = useMap();

  useEffect(() => {
    if (focus) {
      map.fitBounds(focus, { padding: [60, 60], maxZoom: 16, animate: true });
    } else if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [map, bounds, focus]);

  return null;
}

function InstallationMarkers<T extends Located>({
  installations,
  selectedId,
  onSelect,
}: Pick<InstallationsMapProps<T>, 'installations' | 'selectedId' | 'onSelect'>) {
  const map = useMap();
  // Re-render whenever the view settles, reading the zoom from the map itself.
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useMapEvents({ zoomend: rerender, moveend: rerender });
  // The initial framing happens before these listeners exist.
  useEffect(rerender, []);
  const zoom = map.getZoom();

  return (
    <>
      {installations.map((installation) => {
        const selected = installation.id === selectedId;
        // Clicking the selected one again clears it, so the map is a filter
        // you can step out of without hunting for a reset button.
        const toggle = { click: () => onSelect(selected ? null : installation.id) };
        const centre = map.project([installation.lat, installation.lng], zoom);
        const apart = installation.members.some(
          (m) => map.project([m.lat, m.lng], zoom).distanceTo(centre) > SPLIT_PIXELS / 2
        );

        if (installation.members.length > 1 && !apart) {
          return (
            <Marker
              key={installation.id}
              position={[installation.lat, installation.lng]}
              icon={makeInstallationIcon(installation.members.length, selected)}
              eventHandlers={toggle}
            >
              {installation.label && <Tooltip direction="top" offset={[0, -14]}>{installation.label}</Tooltip>}
            </Marker>
          );
        }
        return installation.members.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={makeAssetIcon(selected)} eventHandlers={toggle}>
            <Tooltip direction="top" offset={[0, -8]}>{m.name}</Tooltip>
          </Marker>
        ));
      })}
    </>
  );
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
    return hit ? L.latLngBounds(hit.members.map((m) => [m.lat, m.lng] as [number, number])) : null;
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
        attribution={`${LeafletMapConfig.tileLayerAttribution} · <a href="https://www.geonames.org">GeoNames</a>`}
      />
      <Frame bounds={bounds} focus={focus} />
      <InstallationMarkers installations={installations} selectedId={selectedId} onSelect={onSelect} />
    </MapContainer>
  );
}
