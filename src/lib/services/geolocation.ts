import type { GeolocationCoordinates } from '../geolocation/types';
export type { GeolocationCoordinates, MapConfig, OnLocationChange } from '../geolocation/types';
import {
  GeolocationNotAvailableError,
  GeolocationPermissionDeniedError,
  InvalidCoordinatesError,
} from '../geolocation/errors';

export interface GeolocationService {
  getCurrentLocation(): Promise<GeolocationCoordinates>;
  validateCoordinates(
    coords: GeolocationCoordinates | null | undefined
  ): Promise<boolean>;
  formatCoordinates(
    coords: GeolocationCoordinates
  ): Promise<string>;
}

/**
 * Implementación del GeolocationService usando la API nativa del navegador
 * Esta implementación es agnóstica del proveedor de mapas (Leaflet, Google Maps, etc.)
 */
export function createGeolocationService(): GeolocationService {
  return {
    /**
     * Obtiene la ubicación actual del navegador
     */
    async getCurrentLocation(): Promise<GeolocationCoordinates> {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        throw new GeolocationNotAvailableError(
          'La geolocalización no está disponible en tu navegador'
        );
      }

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            if (error.code === 1) {
              reject(
                new GeolocationPermissionDeniedError(
                  'Permiso de geolocalización denegado'
                )
              );
            } else {
              reject(
                new GeolocationNotAvailableError(
                  `No se pudo obtener tu ubicación: ${error.message}`
                )
              );
            }
          }
        );
      });
    },

    /**
     * Valida si las coordenadas son válidas
     */
    async validateCoordinates(
      coords: GeolocationCoordinates | null | undefined
    ): Promise<boolean> {
      if (!coords) {
        throw new InvalidCoordinatesError(
          'Las coordenadas proporcionadas no son válidas',
          coords
        );
      }
      if (typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
        throw new InvalidCoordinatesError(
          'Las coordenadas proporcionadas no son válidas',
          coords
        );
      }
      if (
        isNaN(coords.lat) ||
        isNaN(coords.lng) ||
        coords.lat < -90 ||
        coords.lat > 90 ||
        coords.lng < -180 ||
        coords.lng > 180
      ) {
        throw new InvalidCoordinatesError(
          'Las coordenadas proporcionadas no son válidas',
          coords
        );
      }
      return true;
    },

    /**
     * Formatea las coordenadas para mostrar al usuario
     */
    async formatCoordinates(coords: GeolocationCoordinates): Promise<string> {
      return `Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(6)}`;
    },
  };
}

export const geolocationService = createGeolocationService();
