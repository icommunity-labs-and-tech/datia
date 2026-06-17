'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { uploadFraudReportPhoto } from '@/actions/fraudReports/upload-fraud-report-photo';

const LeafletMap = dynamic(() => import('./FraudReportMap'), { ssr: false, loading: () => null });

interface ReportFraudDrawerProps {
  itemId: string;
  open: boolean;
  onClose: () => void;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

interface LocationCoords {
  lat: number;
  lng: number;
}

interface PhotoEntry {
  id: string;
  previewUrl: string;
  uploadedUrl: string | null;
  uploading: boolean;
  error: boolean;
}

const MAX_PHOTOS = 5;

export function ReportFraudDrawer({ itemId, open, onClose }: ReportFraudDrawerProps) {
  const t = useTranslations('fraudReport');
  const [acquiredAt, setAcquiredAt] = useState('');
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [comments, setComments] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [geoError, setGeoError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const isDragging = useRef(false);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setAcquiredAt('');
      setCoords(null);
      setComments('');
      setSubmitState('idle');
      setGeoError('');
      setPhotos([]);
    }
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError(t('locationNotSupported'));
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError(t('locationDenied'));
        setGeoLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [t]);

  const handlePhotoFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const toAdd = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    if (toAdd.length === 0) return;

    const entries: PhotoEntry[] = toAdd.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      previewUrl: URL.createObjectURL(file),
      uploadedUrl: null,
      uploading: true,
      error: false,
    }));

    setPhotos((prev) => [...prev, ...entries]);

    // Upload each in parallel
    await Promise.all(
      entries.map(async (entry, i) => {
        const formData = new FormData();
        formData.append('photo', toAdd[i]);
        const result = await uploadFraudReportPhoto(formData);
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === entry.id
              ? { ...p, uploading: false, uploadedUrl: result.url ?? null, error: !result.url }
              : p
          )
        );
      })
    );
  }, [photos.length]);

  const handleRemovePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const entry = prev.find((p) => p.id === id);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submitState === 'submitting') return;
    setSubmitState('submitting');

    try {
      const body: Record<string, unknown> = { itemId };
      if (acquiredAt.trim()) body.acquiredAt = acquiredAt.trim();
      if (coords) {
        body.latitude = coords.lat;
        body.longitude = coords.lng;
      }
      if (comments.trim()) body.comments = comments.trim();
      const uploadedUrls = photos.map((p) => p.uploadedUrl).filter((u): u is string => !!u);
      if (uploadedUrls.length > 0) body.imageUrls = uploadedUrls;

      const res = await fetch('/api/customer/fraud-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Server error');
      setSubmitState('success');
    } catch {
      setSubmitState('error');
    }
  }, [itemId, acquiredAt, coords, comments, submitState]);

  // Touch drag-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = false;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current !== null && e.touches[0].clientY - startY.current > 50) {
      isDragging.current = true;
    }
  };
  const handleTouchEnd = () => {
    if (isDragging.current) onClose();
    startY.current = null;
    isDragging.current = false;
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 1000, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', zIndex: 1001,
          borderRadius: '20px 20px 0 0',
          maxHeight: '92dvh',
          overflowY: 'auto',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
          animation: 'drawerSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d1d5db' }} />
        </div>

        <div style={{ padding: '0 20px 32px' }}>
          {submitState === 'success' ? (
            <SuccessView onClose={onClose} t={t} />
          ) : (
            <>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                    {t('title')}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    {t('subtitle')}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    background: '#f1f5f9', border: 'none', borderRadius: '50%',
                    width: 34, height: 34, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                  aria-label="Cerrar"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Field: dónde adquiriste */}
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>{t('acquiredLabel')}</label>
                <textarea
                  value={acquiredAt}
                  onChange={(e) => setAcquiredAt(e.target.value)}
                  placeholder={t('acquiredPlaceholder')}
                  rows={2}
                  style={textareaStyle}
                />
              </div>

              {/* Sección del mapa */}
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>{t('locationLabel')}</label>

                {/* Botón geolocalización */}
                <button
                  onClick={handleUseMyLocation}
                  disabled={geoLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '10px 14px',
                    background: coords ? '#f0fdf4' : '#f8fafc',
                    border: `1.5px solid ${coords ? '#22c55e' : '#e2e8f0'}`,
                    borderRadius: 10, cursor: 'pointer', marginBottom: 10,
                    fontSize: '0.875rem', fontWeight: 500,
                    color: coords ? '#15803d' : '#374151',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ width: 18, height: 18, flexShrink: 0 }}>
                    <circle cx="12" cy="11" r="3" />
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  </svg>
                  {geoLoading ? t('locating') : coords ? t('locationSet') : t('useMyLocation')}
                </button>

                {geoError && (
                  <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#dc2626' }}>{geoError}</p>
                )}

                {/* Mapa */}
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e2e8f0', height: 200 }}>
                  <LeafletMap coords={coords} onMarkerMove={setCoords} />
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  {t('mapHint')}
                </p>
              </div>

              {/* Comentarios */}
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>{t('commentsLabel')}</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={t('commentsPlaceholder')}
                  rows={3}
                  style={textareaStyle}
                />
              </div>

              {/* Fotos */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>{t('photosLabel')}</label>
                <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: '#64748b' }}>
                  {t('photosHint')}
                </p>

                {/* Thumbnails */}
                {photos.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        style={{
                          position: 'relative', width: 72, height: 72,
                          borderRadius: 10, overflow: 'hidden',
                          border: `2px solid ${photo.error ? '#dc2626' : photo.uploadedUrl ? '#22c55e' : '#e2e8f0'}`,
                          flexShrink: 0,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.previewUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {/* Uploading spinner overlay */}
                        {photo.uploading && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(255,255,255,0.7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{
                              width: 20, height: 20, border: '2.5px solid #0d6efd',
                              borderTopColor: 'transparent', borderRadius: '50%',
                              animation: 'spin 0.7s linear infinite',
                            }} />
                          </div>
                        )}
                        {/* Error indicator */}
                        {photo.error && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(220,38,38,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" style={{ width: 22, height: 22 }}>
                              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                          </div>
                        )}
                        {/* Remove button */}
                        {!photo.uploading && (
                          <button
                            onClick={() => handleRemovePhoto(photo.id)}
                            style={{
                              position: 'absolute', top: 2, right: 2,
                              width: 20, height: 20, borderRadius: '50%',
                              background: 'rgba(0,0,0,0.55)', border: 'none',
                              cursor: 'pointer', padding: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            aria-label="Remove photo"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ width: 10, height: 10 }}>
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add photo button */}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px',
                      background: '#f8fafc', border: '1.5px dashed #cbd5e1',
                      borderRadius: 10, cursor: 'pointer',
                      fontSize: '0.875rem', fontWeight: 500, color: '#475569',
                      transition: 'all 0.15s',
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ width: 18, height: 18, flexShrink: 0 }}>
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    {t('photosAdd')} {photos.length > 0 && `(${photos.length}/${MAX_PHOTOS})`}
                  </button>
                )}

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handlePhotoFiles(e.target.files)}
                />
              </div>

              {submitState === 'error' && (
                <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#dc2626', textAlign: 'center' }}>
                  {t('errorMessage')}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitState === 'submitting'}
                style={{
                  width: '100%', padding: '15px',
                  background: submitState === 'submitting' ? '#94a3b8' : '#dc2626',
                  color: '#fff', border: 'none', borderRadius: 12,
                  fontSize: '1rem', fontWeight: 700, cursor: submitState === 'submitting' ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  minHeight: 52,
                }}
              >
                {submitState === 'submitting' ? t('submitting') : t('submit')}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes drawerSlideUp {
          from { transform: translateY(100%); opacity: 0.5; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

function SuccessView({ onClose, t }: { onClose: () => void; t: (key: string) => string }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" style={{ width: 32, height: 32 }}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '1.1rem', fontWeight: 700 }}>
        {t('successTitle')}
      </h3>
      <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
        {t('successMessage')}
      </p>
      <button
        onClick={onClose}
        style={{
          padding: '13px 32px', background: '#f1f5f9', border: 'none',
          borderRadius: 10, fontSize: '0.95rem', fontWeight: 600,
          color: '#374151', cursor: 'pointer',
        }}
      >
        {t('close')}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 6,
  fontSize: '0.875rem', fontWeight: 600, color: '#374151',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1.5px solid #e2e8f0', borderRadius: 10,
  fontSize: '0.95rem', color: '#1e293b',
  outline: 'none', boxSizing: 'border-box',
  background: '#fff',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 72,
  fontFamily: 'inherit',
};
