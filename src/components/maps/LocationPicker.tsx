'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { LeafletMapConfig } from '@/lib/geolocation/maps';

export interface Point {
  lat: number;
  lng: number;
}

const pin = L.divIcon({
  className: '',
  html: `<div style="
    width:20px;height:20px;border-radius:50%;background:#1c4ed8;
    border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function ClickToPlace({ onChange }: { onChange: (p: Point) => void }) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** Follows the point when it comes from elsewhere (a search, the number fields). */
function Follow({ point, zoom }: { point: Point | null; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    if (!map.getBounds().contains([point.lat, point.lng]) || map.getZoom() < zoom) {
      map.setView([point.lat, point.lng], Math.max(map.getZoom(), zoom));
    }
  }, [map, point, zoom]);
  return null;
}

/** Click to place the pin, drag to adjust it. */
export default function LocationPicker({
  value,
  onChange,
  height = 240,
}: {
  value: Point | null;
  onChange: (p: Point) => void;
  height?: number;
}) {
  return (
    <MapContainer
      center={value ? [value.lat, value.lng] : [LeafletMapConfig.defaultCenter.lat, LeafletMapConfig.defaultCenter.lng]}
      zoom={value ? 14 : 5}
      style={{ height, width: '100%', borderRadius: 8, cursor: 'crosshair' }}
      scrollWheelZoom
    >
      <TileLayer url={LeafletMapConfig.tileLayerUrl} attribution={LeafletMapConfig.tileLayerAttribution} />
      <ClickToPlace onChange={onChange} />
      <Follow point={value} zoom={13} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={pin}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = (e.target as L.Marker).getLatLng();
              onChange({ lat, lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
