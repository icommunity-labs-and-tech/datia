'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons broken by webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Coords {
  lat: number;
  lng: number;
}

interface FraudReportMapProps {
  coords: Coords | null;
  onMarkerMove: (coords: Coords) => void;
  readonly?: boolean;
}

function ClickHandler({ onMarkerMove }: { onMarkerMove: (c: Coords) => void }) {
  useMapEvents({
    click(e) {
      onMarkerMove({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapRecenter({ coords }: { coords: Coords }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.setView([coords.lat, coords.lng], map.getZoom());
  }, [coords.lat, coords.lng, map]);
  return null;
}

export default function FraudReportMap({ coords, onMarkerMove, readonly = false }: FraudReportMapProps) {
  const defaultCenter: [number, number] = coords ? [coords.lat, coords.lng] : [40.4168, -3.7038];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={coords ? 14 : 5}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {!readonly && <ClickHandler onMarkerMove={onMarkerMove} />}
      {coords && (
        <>
          <Marker position={[coords.lat, coords.lng]} />
          <MapRecenter coords={coords} />
        </>
      )}
    </MapContainer>
  );
}
