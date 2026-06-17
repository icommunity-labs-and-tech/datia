/**
 * Leaflet map configuration
 */

export const LeafletMapConfig = {
  tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileLayerAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  defaultCenter: {
    lat: 40.4168,
    lng: -3.7038, // Madrid, Spain
  },
  defaultZoom: 6,
  defaultZoomWithLocation: 13,
};
