import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Optimizaciones para Cloud Run
  output: 'standalone',
  experimental: {
    // Optimizaciones de rendimiento
    optimizePackageImports: [
      '@tanstack/react-table',
      'react-bootstrap',
      'bootstrap-icons',
      '@mantine/core',
      '@mantine/hooks',
      '@mantine/charts',
      '@mantine/dates',
      '@mantine/notifications',
      '@mantine/modals',
      '@tabler/icons-react',
    ],
  },
  // Configuración de imágenes para Cloud Run
  images: {
    unoptimized: true, // Cloud Run no necesita optimización de imágenes
    domains: [
      'localhost',
      '34.175.253.254', // Tu Cloud SQL IP
      'storage.googleapis.com',
    ],
  },
  // Assets used to be «items» in the URLs (#26). Printed QR codes point at
  // /customer/item/<id> and cannot be reissued, so those keep working for good;
  // the dashboard route is internal, and is redirected only so bookmarks do not
  // break. The API is not aliased: there were no integrators when it moved.
  async redirects() {
    return [
      { source: '/customer/item/:id', destination: '/customer/asset/:id', permanent: true },
      { source: '/dashboard/items', destination: '/dashboard/assets', permanent: true },
      { source: '/dashboard/items/:id', destination: '/dashboard/assets/:id', permanent: true },
    ];
  },
  // /api/v1-sandbox/** → /api/v1/** (same handlers; sandbox mode is determined by the auth token)
  async rewrites() {
    return [
      {
        source: '/api/v1-sandbox/:path*',
        destination: '/api/v1/:path*',
      },
    ];
  },
  // Configuración de headers para Cloud Run
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
