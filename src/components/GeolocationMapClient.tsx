'use client';

import dynamic from 'next/dynamic';
import { Button, Alert, Spinner } from 'react-bootstrap';
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
        <div className="d-flex align-items-center justify-content-center" style={{ height: '350px', border: '2px solid #e9ecef', borderRadius: '8px' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" className="mb-2" />
            <p className="text-muted mb-0">Cargando mapa...</p>
          </div>
        </div>
      </div>
    )
  }
);

export default function GeolocationMap(props: GeolocationMapProps) {
  return <GeolocationMapInternal {...props} />;
}

