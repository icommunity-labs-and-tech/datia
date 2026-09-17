'use client';

import { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { LeafletMapConfig } from '@/lib/geolocation/maps';
import type { GeolocationCoordinates } from '@/lib/geolocation/types';
import { extractGeolocationField } from '@/lib/template-helpers';
import { IconCalendar, IconListNumbers, IconMap, IconMapPin, IconTag } from '@tabler/icons-react';

// Fix para los iconos de Leaflet en Next.js - solo ejecutar en cliente
if (typeof window !== 'undefined') {
  try {
    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  } catch (e) {
    // Ignorar errores durante SSR
  }
}

export interface StateWithLocation {
  id: string;
  title?: string | null;
  description?: string | null;
  createdAt?: Date | string;
  templateConfig?: unknown;
  statusType?: {
    name?: string;
  } | null;
}

export interface ItemStatesMapProps {
  states: StateWithLocation[];
}

export default function ItemStatesMap({ states }: ItemStatesMapProps) {
  // Extraer estados con geolocalización y sus coordenadas
  const statesWithLocations = useMemo(() => {
    return states
      .map((state) => {
        // Asegurarse de que templateConfig es un objeto, no un string JSON
        let templateConfig = state.templateConfig;
        if (typeof templateConfig === 'string') {
          try {
            templateConfig = JSON.parse(templateConfig);
          } catch (e) {
            console.warn('Error parsing templateConfig:', e);
            return null;
          }
        }
        
        const coords = extractGeolocationField(templateConfig);
        if (!coords) return null;
        return {
          state,
          coords,
        };
      })
      .filter((item): item is { state: StateWithLocation; coords: GeolocationCoordinates } => item !== null);
  }, [states]);

  // Calcular el centro y los límites del mapa para ajustar la vista
  const bounds = useMemo(() => {
    if (statesWithLocations.length === 0) return null;
    
    const lats = statesWithLocations.map((item) => item.coords.lat);
    const lngs = statesWithLocations.map((item) => item.coords.lng);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    return {
      center: {
        lat: (minLat + maxLat) / 2,
        lng: (minLng + maxLng) / 2,
      },
      bounds: [
        [minLat, minLng],
        [maxLat, maxLng],
      ] as [[number, number], [number, number]],
    };
  }, [statesWithLocations]);

  // Crear puntos para la línea de seguimiento (ordenados por fecha de creación)
  const pathPoints = useMemo(() => {
    return statesWithLocations
      .sort((a, b) => {
        const dateA = a.state.createdAt 
          ? new Date(a.state.createdAt).getTime() 
          : 0;
        const dateB = b.state.createdAt 
          ? new Date(b.state.createdAt).getTime() 
          : 0;
        return dateA - dateB;
      })
      .map((item) => [item.coords.lat, item.coords.lng] as [number, number]);
  }, [statesWithLocations]);

  // Estado para la animación de la línea
  const [animatedPathPoints, setAnimatedPathPoints] = useState<[number, number][]>([]);

  // Efecto para animar la línea progresivamente
  useEffect(() => {
    if (pathPoints.length <= 1) {
      setAnimatedPathPoints(pathPoints);
      return;
    }

    // Resetear la animación cuando cambian los puntos
    setAnimatedPathPoints([]);

    // Animar la línea punto por punto
    const animationDuration = 8000; // 8 segundos totales (más lento para mejor visualización)
    const delayPerPoint = animationDuration / pathPoints.length;
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex++;
      setAnimatedPathPoints(pathPoints.slice(0, currentIndex + 1));
      
      if (currentIndex >= pathPoints.length - 1) {
        clearInterval(interval);
      }
    }, delayPerPoint);

    return () => clearInterval(interval);
  }, [pathPoints]);

  // Calcular zoom dinámico basado en la distancia entre los puntos más lejanos
  const calculateZoom = useMemo(() => {
    if (!bounds || statesWithLocations.length === 0) {
      return LeafletMapConfig.defaultZoom;
    }

    if (statesWithLocations.length === 1) {
      return 15; // Zoom alto para un solo punto
    }

    // Calcular la distancia en grados entre los puntos más lejanos
    const latDiff = bounds.bounds[1][0] - bounds.bounds[0][0];
    const lngDiff = bounds.bounds[1][1] - bounds.bounds[0][1];
    
    // Calcular la distancia aproximada en kilómetros usando la fórmula de Haversine simplificada
    // Para distancias pequeñas, podemos usar una aproximación más simple
    const latKm = latDiff * 111; // 1 grado de latitud ≈ 111 km
    const avgLat = (bounds.bounds[0][0] + bounds.bounds[1][0]) / 2;
    const lngKm = lngDiff * 111 * Math.cos(avgLat * Math.PI / 180);
    const maxDistance = Math.max(latKm, Math.abs(lngKm));

    // Calcular zoom basado en la distancia máxima
    // Fórmula empírica: zoom más bajo para distancias mayores
    let zoom: number;
    if (maxDistance > 1000) {
      // Más de 1000 km (país o continente)
      zoom = 5;
    } else if (maxDistance > 500) {
      // 500-1000 km (región grande)
      zoom = 6;
    } else if (maxDistance > 200) {
      // 200-500 km (región)
      zoom = 7;
    } else if (maxDistance > 100) {
      // 100-200 km (provincia/estado)
      zoom = 8;
    } else if (maxDistance > 50) {
      // 50-100 km (área metropolitana grande)
      zoom = 9;
    } else if (maxDistance > 20) {
      // 20-50 km (área metropolitana)
      zoom = 10;
    } else if (maxDistance > 10) {
      // 10-20 km (ciudad grande)
      zoom = 11;
    } else if (maxDistance > 5) {
      // 5-10 km (ciudad)
      zoom = 12;
    } else if (maxDistance > 2) {
      // 2-5 km (barrio/área local)
      zoom = 13;
    } else if (maxDistance > 1) {
      // 1-2 km (área muy local)
      zoom = 14;
    } else {
      // Menos de 1 km (muy cercano)
      zoom = 15;
    }

    return zoom;
  }, [bounds, statesWithLocations]);

  const center: [number, number] = bounds
    ? [bounds.center.lat, bounds.center.lng]
    : [LeafletMapConfig.defaultCenter.lat, LeafletMapConfig.defaultCenter.lng];

  // Si no hay estados con geolocalización, mostrar mensaje
  if (statesWithLocations.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        <IconMap size={15} stroke={1.7} style={{ marginRight: 8, verticalAlign: -2 }} />
        No hay estados con geolocalización para mostrar en el mapa.
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '500px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '2px solid #e9ecef',
      }}
    >
      <MapContainer
        center={center}
        zoom={calculateZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        bounds={bounds?.bounds}
        boundsOptions={{ padding: [80, 80], maxZoom: 18 }}
        // react-leaflet declara whenReady sin argumentos, pero lo pasa a
        // map.whenReady de Leaflet, que lo llama con { target: map }.
        whenReady={((event: { target: L.Map }) => {
          // Ajustar automáticamente el zoom cuando el mapa esté listo
          if (bounds && statesWithLocations.length > 1) {
            event.target.fitBounds(bounds.bounds, {
              padding: [80, 80],
              maxZoom: 18,
            });
          }
        }) as () => void}
      >
        <TileLayer
          attribution={LeafletMapConfig.tileLayerAttribution}
          url={LeafletMapConfig.tileLayerUrl}
        />
        
        {/* Línea de seguimiento conectando los estados en orden cronológico */}
        {animatedPathPoints.length > 1 && (
          <>
            {/* Línea completa (semi-transparente) como fondo */}
            <Polyline
              positions={pathPoints}
              color="#0d6efd"
              weight={4}
              opacity={0.2}
              dashArray="5, 5"
            />
            {/* Línea animada (más visible) que se dibuja progresivamente */}
            <Polyline
              positions={animatedPathPoints}
              color="#0d6efd"
              weight={4}
              opacity={0.9}
              dashArray="5, 5"
            />
            {/* Marcador especial en el punto final de la animación */}
            {animatedPathPoints.length > 0 && animatedPathPoints.length < pathPoints.length && (
              <Marker 
                position={animatedPathPoints[animatedPathPoints.length - 1]}
                icon={L.divIcon({
                  className: 'animated-path-marker',
                  html: '<div style="background-color: #0d6efd; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(13, 110, 253, 0.8); animation: pulse 1s infinite;"></div>',
                  iconSize: [12, 12],
                  iconAnchor: [6, 6],
                })}
              />
            )}
          </>
        )}
        
        {/* Marcadores para cada estado */}
        {statesWithLocations.map(({ state, coords }, index) => {
          const createdAt = state.createdAt 
            ? new Date(state.createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Fecha no disponible';
          
          return (
            <Marker key={state.id} position={[coords.lat, coords.lng]}>
              <Popup>
                <div>
                  <strong>{state.title}</strong>
                  {state.statusType && (
                    <div className="small text-muted mb-2">
                      <IconTag size={13} stroke={1.7} style={{ marginRight: 4, verticalAlign: -2 }} />
                      {state.statusType.name}
                    </div>
                  )}
                  {state.description && (
                    <div className="mb-2">{state.description}</div>
                  )}
                  <div className="small text-muted">
                    <IconCalendar size={13} stroke={1.7} style={{ marginRight: 4, verticalAlign: -2 }} />
                    {createdAt}
                  </div>
                  <div className="small text-muted mt-1">
                    <IconMapPin size={13} stroke={1.7} style={{ marginRight: 4, verticalAlign: -2 }} />
                    {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                  </div>
                  <div className="small text-muted mt-1">
                    <IconListNumbers size={13} stroke={1.7} style={{ marginRight: 4, verticalAlign: -2 }} />
                    Estado #{index + 1}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.7;
          }
        }
        .animated-path-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}

