'use client';

import { useState } from 'react';
import { Form, Spinner } from 'react-bootstrap';
import Link from 'next/link';
import Image from 'next/image';

export interface LoginPageLayoutProps {
  /** Left panel */
  logoUrl?: string | null;
  orgName?: string | null;
  /** Primary brand color — left panel base, button, focus ring. Default: #0f172a */
  brandColor?: string;
  /** Secondary brand color — gradient accent on left panel. Default: same as primary */
  brandColorSecondary?: string;
  poweredByText?: string;
  /** Right panel */
  role: 'admin' | 'operator';
  subtitle: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  accessText: string;
  accessingText: string;
  crossLinkLabel: string;
  crossLinkCta: string;
  crossLinkHref: string;
  /** Form state */
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function LoginPageLayout({
  logoUrl,
  orgName,
  brandColor = '#0f172a',
  brandColorSecondary,
  poweredByText,
  role,
  subtitle,
  emailPlaceholder,
  passwordPlaceholder,
  accessText,
  accessingText,
  crossLinkLabel,
  crossLinkCta,
  crossLinkHref,
  email,
  password,
  isLoading,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginPageLayoutProps) {
  const [pwVisible, setPwVisible] = useState(false);
  const roleIcon = role === 'admin' ? 'bi-shield-check' : 'bi-tools';
  const secondary = brandColorSecondary ?? brandColor;
  const panelBg = brandColorSecondary
    ? `linear-gradient(135deg, ${brandColor} 0%, ${secondary} 100%)`
    : brandColor;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Brand panel ── */}
      <div style={{
        width: '42%',
        minWidth: 280,
        background: panelBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3.5rem 2.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: 360, height: 360, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', right: '-60px',
          width: 280, height: 280, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '45%', right: '-40px',
          width: 160, height: 160, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />

        {/* Logo + org name */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            borderRadius: 20,
            padding: '1.75rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            {logoUrl ? (
              <Image src={logoUrl} alt={orgName ?? 'Logo'} width={180} height={64}
                style={{ objectFit: 'contain', maxWidth: '100%' }} priority unoptimized />
            ) : (
              <Image src="/logo.webp" alt="CertyPass" width={160} height={54}
                style={{ objectFit: 'contain', maxWidth: '100%', filter: 'brightness(0) invert(1)' }} priority />
            )}
          </div>

          {orgName && (
            <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '1rem', textAlign: 'center', margin: 0, letterSpacing: '0.01em' }}>
              {orgName}
            </p>
          )}
        </div>

        {/* Powered by */}
        {poweredByText && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {poweredByText}
            </span>
            <Image src="/logo.webp" alt="CertyPass" width={68} height={22}
              style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.4 }} priority />
          </div>
        )}
      </div>

      {/* ── Form panel ── */}
      <div style={{
        flex: 1,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Role badge */}
          <div style={{ marginBottom: '2rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: `${brandColor}12`, color: brandColor,
              fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em',
              textTransform: 'uppercase', padding: '0.35rem 0.75rem',
              borderRadius: 999, border: `1px solid ${brandColor}22`,
            }}>
              <i className={`bi ${roleIcon}`} style={{ fontSize: '0.8rem' }} />
              {subtitle}
            </span>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem', lineHeight: 1.2 }}>
            Bienvenido
          </h1>
          {orgName && (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2.25rem' }}>
              {orgName}
            </p>
          )}
          {!orgName && <div style={{ marginBottom: '2.25rem' }} />}

          <Form onSubmit={onSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-envelope" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem', pointerEvents: 'none' }} />
                <input
                  type="email" value={email} onChange={e => onEmailChange(e.target.value)}
                  placeholder={emailPlaceholder} required disabled={isLoading}
                  style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.9rem', color: '#0f172a', background: '#f8fafc', outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = brandColor}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <i className="bi bi-lock" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem', pointerEvents: 'none' }} />
                <input
                  type={pwVisible ? 'text' : 'password'} value={password}
                  onChange={e => onPasswordChange(e.target.value)}
                  placeholder={passwordPlaceholder} required disabled={isLoading}
                  style={{ width: '100%', padding: '0.7rem 2.75rem 0.7rem 2.5rem', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.9rem', color: '#0f172a', background: '#f8fafc', outline: 'none', transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = brandColor}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button type="button" onClick={() => setPwVisible(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94a3b8' }}>
                  <i className={`bi ${pwVisible ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '0.9rem' }} />
                </button>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.6rem 0.9rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#dc2626' }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button
              type="submit" disabled={isLoading}
              style={{ width: '100%', padding: '0.75rem', background: isLoading ? '#94a3b8' : brandColor, color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.95rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity 0.15s', marginBottom: '1.75rem' }}
            >
              {isLoading
                ? <><Spinner animation="border" size="sm" />{accessingText}</>
                : <>{accessText} <i className="bi bi-arrow-right" /></>
              }
            </button>
          </Form>

          <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
            {crossLinkLabel}{' '}
            <Link href={crossLinkHref} style={{ color: brandColor, fontWeight: 600, textDecoration: 'none' }}>
              {crossLinkCta}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
