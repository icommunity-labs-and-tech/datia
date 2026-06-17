/**
 * Types for geolocation service
 */

export interface GeolocationCoordinates {
  lat: number;
  lng: number;
}

export interface MapConfig {
  center: GeolocationCoordinates;
  zoom: number;
  height?: string;
  width?: string;
  readOnly?: boolean;
}

export type OnLocationChange = (coords: GeolocationCoordinates) => void;
