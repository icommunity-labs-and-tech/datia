import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Certificación Energética — Datia',
  description: 'Pasaporte digital de emisiones de CO₂ y consumo energético',
};

export default function EnergyPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        body {
          background: linear-gradient(160deg, #f0fdf4 0%, #ecfdf5 40%, #f8fafc 100%) !important;
        }
      `}</style>
      <div style={{ minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {children}
      </div>
    </>
  );
}
