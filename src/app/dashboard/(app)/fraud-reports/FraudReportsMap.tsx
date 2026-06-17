'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FraudReportStatus, FraudReportWithItem } from '@/domain/fraudReports/FraudReport';

// Fix default marker icons broken by webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLORS: Record<FraudReportStatus, string> = {
  PENDING: '#f59e0b',
  UNDER_REVIEW: '#3b82f6',
  CONFIRMED: '#ef4444',
  DISMISSED: '#94a3b8',
};

const STATUS_LABELS: Record<FraudReportStatus, string> = {
  PENDING: 'Pendiente',
  UNDER_REVIEW: 'En revisión',
  CONFIRMED: 'Confirmada',
  DISMISSED: 'Descartada',
};

function makeIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

function AutoBounds({ reports }: { reports: FraudReportWithItem[] }) {
  const map = useMap();
  useEffect(() => {
    const points = reports
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => [r.latitude!, r.longitude!] as [number, number]);
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [reports, map]);
  return null;
}

interface FraudReportsMapProps {
  reports: FraudReportWithItem[];
  onSelectReport: (id: string) => void;
}

export default function FraudReportsMap({ reports, onSelectReport }: FraudReportsMapProps) {
  const reportsWithCoords = reports.filter((r) => r.latitude != null && r.longitude != null);
  const defaultCenter: [number, number] = [40.4168, -3.7038];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={5}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AutoBounds reports={reportsWithCoords} />
      {reportsWithCoords.map((r) => (
        <Marker
          key={r.id}
          position={[r.latitude!, r.longitude!]}
          icon={makeIcon(STATUS_COLORS[r.status])}
        >
          <Popup>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.item.name}</div>
              {r.acquiredAt && (
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>{r.acquiredAt}</div>
              )}
              <div style={{ marginBottom: 8 }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: STATUS_COLORS[r.status] + '22',
                  color: STATUS_COLORS[r.status],
                  border: `1px solid ${STATUS_COLORS[r.status]}55`,
                }}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
              <button
                onClick={() => onSelectReport(r.id)}
                style={{
                  width: '100%', padding: '5px 10px',
                  background: '#3b82f6', color: '#fff',
                  border: 'none', borderRadius: 6,
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Ver detalle
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
