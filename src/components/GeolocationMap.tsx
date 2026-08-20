'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Button, Alert, Loader } from '@mantine/core';
import L from 'leaflet';
import { LeafletMapConfig } from '@/lib/geolocation/maps';
import type { GeolocationCoordinates } from '@/lib/geolocation/types';
import { IconInfoCircle, IconMapPin } from '@tabler/icons-react';

// Fix para los iconos de Leaflet en Next.js - solo ejecutar en cliente
if (typeof window !== 'undefined') {
  // Solo ejecutar cuando window está disponible
  try {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  } catch (e) {
    // Ignorar errores durante SSR
  }
}

interface GeolocationMapProps {
  value?: GeolocationCoordinates;
  onChange?: (coords: GeolocationCoordinates) => void;
  required?: boolean;
  readOnly?: boolean;
  label?: string;
}

function MapClickHandler({ onChange, readOnly }: { onChange?: (coords: GeolocationCoordinates) => void; readOnly?: boolean }) {
  useMapEvents({
    click: (e) => {
      if (!readOnly && onChange) {
        onChange({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        });
      }
    },
  });
  return null;
}

// Componente para actualizar la vista del mapa cuando cambian las coordenadas
function MapViewUpdater({ coords }: { coords: GeolocationCoordinates | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (coords) {
      // Hacer zoom y centrar en la nueva ubicación con una animación suave
      map.setView([coords.lat, coords.lng], 15, {
        animate: true,
        duration: 1.0,
      });
    }
  }, [coords, map]);
  
  return null;
}

export default function GeolocationMap({
  value,
  onChange,
  required = false,
  readOnly = false,
  label,
}: GeolocationMapProps) {
  const tCommon = useTranslations('common');
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(
    value || null
  );
  const [error, setError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    if (value) {
      setCoords(value);
    }
  }, [value]);

  const handleMapClick = (newCoords: GeolocationCoordinates) => {
    setCoords(newCoords);
    setError(null);
    if (onChange) {
      onChange(newCoords);
    }
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    setError(null);

    try {
      // En el cliente, usamos la API del navegador directamente
      // El servicio está disponible para tests y uso futuro con dependency injection
      if (!navigator.geolocation) {
        throw new Error('La geolocalización no está disponible en tu navegador');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const newCoords: GeolocationCoordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      
      setCoords(newCoords);
      if (onChange) {
        onChange(newCoords);
      }
    } catch (err: any) {
      setError(
        err.code === 1
          ? 'Permiso de geolocalización denegado'
          : err.message || 'No se pudo obtener tu ubicación'
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Usar configuración centralizada de Leaflet
  const defaultCenter: [number, number] = [
    LeafletMapConfig.defaultCenter.lat,
    LeafletMapConfig.defaultCenter.lng,
  ];
  const center: [number, number] = coords
    ? [coords.lat, coords.lng]
    : defaultCenter;
  const zoom = coords ? LeafletMapConfig.defaultZoomWithLocation : LeafletMapConfig.defaultZoom;

  return (
    <div className="geolocation-map-container">
      {label && (
        <label className="form-label mb-2 d-block">
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </label>
      )}
      
      {error && (
        <Alert color="yellow" mb="xs" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!readOnly && (
        <div className="mb-2 d-flex gap-2 flex-wrap">
          <Button
            variant="default"
            size="xs"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <>
                <Loader size="xs" mr={8} />
                Obteniendo ubicación...
              </>
            ) : (
              <>
                <IconMapPin size={13} stroke={1.7} style={{ marginRight: 8, verticalAlign: -2 }} />
                Usar mi ubicación actual
              </>
            )}
          </Button>
          {coords && (
            <div className="d-flex align-items-center text-muted small">
              <IconInfoCircle size={13} stroke={1.7} style={{ marginRight: 4, verticalAlign: -2 }} />
              Lat: {coords.lat.toFixed(6)}, Lng: {coords.lng.toFixed(6)}
            </div>
          )}
        </div>
      )}

      {readOnly && coords && (
        <div className="mb-2 text-muted small">
          <IconMapPin size={13} stroke={1.7} style={{ marginRight: 4, verticalAlign: -2 }} />
          Lat: {coords.lat.toFixed(6)}, Lng: {coords.lng.toFixed(6)}
        </div>
      )}

      <div
        style={{
          width: '100%',
          height: readOnly ? '300px' : '350px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '2px solid #e9ecef',
        }}
      >
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={!readOnly}
        >
          <TileLayer
            attribution={LeafletMapConfig.tileLayerAttribution}
            url={LeafletMapConfig.tileLayerUrl}
          />
          {coords && <Marker position={[coords.lat, coords.lng]} />}
          <MapViewUpdater coords={coords} />
          {!readOnly && <MapClickHandler onChange={handleMapClick} readOnly={readOnly} />}
        </MapContainer>
      </div>

      {required && !coords && !readOnly && (
        <div className="text-danger small mt-1">
          {tCommon('geolocationRequired')}
        </div>
      )}

      <style jsx>{`
        .geolocation-map-container {
          width: 100%;
          margin: 1rem 0;
        }

        @media (max-width: 768px) {
          .geolocation-map-container > div > div {
            height: 250px !important;
          }
        }
      `}</style>
    </div>
  );
}

