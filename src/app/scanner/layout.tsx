import type { Metadata, Viewport } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

export const metadata: Metadata = {
  title: 'Escáner QR - certypass',
  description: 'Escáner de códigos QR para items',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
