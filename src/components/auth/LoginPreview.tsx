'use client';

import Image from 'next/image';

interface LoginPreviewProps {
  logoUrl: string | null;
  orgName: string;
  colorPrimary: string;
  colorSecondary: string;
}

/**
 * Miniature (~0.28×) preview of the org login page for use in the branding settings.
 * Pure presentational — no interactions.
 */
export default function LoginPreview({ logoUrl, orgName, colorPrimary, colorSecondary }: LoginPreviewProps) {
  const panelBg = colorSecondary
    ? `linear-gradient(135deg, ${colorPrimary} 0%, ${colorSecondary} 100%)`
    : colorPrimary;

  // Scale factor — the "real" login is ~1440px wide, we render it at ~400px
  const SCALE = 0.28;

  return (
    <div style={{
      width: '100%',
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      background: '#fff',
    }}>
      {/* Label */}
      <div style={{ padding: '6px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fca5a5' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fcd34d' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#86efac' }} />
        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6, fontFamily: 'monospace' }}>
          /org/{orgName.toLowerCase().replace(/\s+/g, '-')}/admin
        </span>
      </div>

      {/* Miniature page */}
      <div style={{ display: 'flex', height: 280 }}>

        {/* Left brand panel */}
        <div style={{
          width: '40%',
          background: panelBg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 16px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -15, right: -15, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

          {/* Logo card */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, position: 'relative' }}>
            <div style={{
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: '14px 18px',
              border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {logoUrl ? (
                <Image src={logoUrl} alt={orgName} width={90} height={32} style={{ objectFit: 'contain' }} unoptimized />
              ) : (
                <Image src="/logo.webp" alt="CertyPass" width={80} height={28} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
              )}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>{orgName}</span>
          </div>

          {/* Powered by */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>powered by</span>
            <Image src="/logo.webp" alt="CertyPass" width={36} height={12} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.35 }} />
          </div>
        </div>

        {/* Right form panel */}
        <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 22px', gap: 12 }}>

          {/* Role badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${colorPrimary}14`, borderRadius: 999, padding: '3px 10px', border: `1px solid ${colorPrimary}25`, width: 'fit-content' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: colorPrimary, opacity: 0.7 }} />
            <span style={{ fontSize: 8, fontWeight: 700, color: colorPrimary, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Administrador</span>
          </div>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ height: 13, width: 90, background: '#0f172a', borderRadius: 3 }} />
            <div style={{ height: 8, width: 70, background: '#e2e8f0', borderRadius: 2 }} />
          </div>

          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ height: 24, background: '#f8fafc', border: `1.5px solid ${colorPrimary}`, borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 10, gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#cbd5e1', flexShrink: 0 }} />
              <div style={{ height: 6, width: 70, background: '#e2e8f0', borderRadius: 2 }} />
            </div>
            <div style={{ height: 24, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 10, gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#cbd5e1', flexShrink: 0 }} />
              <div style={{ height: 6, width: 56, background: '#e2e8f0', borderRadius: 2 }} />
            </div>
          </div>

          {/* Button */}
          <div style={{
            height: 26,
            background: colorPrimary,
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.03em' }}>Acceder</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}
