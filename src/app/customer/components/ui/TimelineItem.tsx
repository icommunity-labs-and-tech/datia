'use client';
/* eslint-disable @next/next/no-img-element */

import { useTranslations } from 'next-intl';
import { StateData } from '../../types';
import { TimestampBadge } from './TimestampBadge';
import { VerifiedBadge } from './VerifiedBadge';
import { EvidenceVerification } from '../EvidenceVerification';
import { timelineStyles } from '../../styles/passportStyles';
import GeolocationMap from '@/components/GeolocationMapClient';
import { extractGeolocationField } from '@/lib/template-helpers';
import type { StateLoadStatus } from '../sections/ItemHistorySection';

interface TimelineItemProps {
  state: StateData;
  loadStatus?: StateLoadStatus;
}

export function TimelineItem({ state, loadStatus = 'loaded' }: TimelineItemProps) {
  const t = useTranslations('customer');
  const isPending = loadStatus === 'pending';
  const isLoading = loadStatus === 'loading';
  const showLoadingSpinner = (isPending || isLoading) && state.evidenceID;

  return (
    <div style={timelineStyles.item}>
      <div style={timelineStyles.dot} />
      <div style={timelineStyles.card}>
        <TimestampBadge timestamp={state.createdAt} position="absolute" />

        <h5
          style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#1e293b',
            margin: '0 0 0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            paddingRight: '120px',
          }}
        >
          {state.title}
          {state.evidenceID && <VerifiedBadge title={t('stateVerified')} size="sm" />}
        </h5>

        <p style={{ color: '#64748b', margin: '0 0 0.75rem', lineHeight: '1.5' }}>
          {state.description}
        </p>

        {/* Mapa de geolocalización si existe en templateConfig */}
        {(() => {
          const geolocationField = extractGeolocationField(state.templateConfig);
          if (geolocationField) {
            return (
              <div style={{ marginBottom: '0.75rem' }}>
                <GeolocationMap value={geolocationField} readOnly={true} />
              </div>
            );
          }
          return null;
        })()}

        {state.imageUrls && state.imageUrls.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            {state.imageUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={t('evidenceImageAlt', { index: index + 1 })}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1px solid #e2e8f0',
                }}
              />
            ))}
          </div>
        )}

        {/* Loading spinner for pending states */}
        {showLoadingSpinner && isPending && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ display: 'inline-block' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" className="animate-spin" style={{ color: '#3b82f6' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>{t('loadingCertification')}</span>
          </div>
        )}

        {/* Show EvidenceVerification only when loading or loaded */}
        {state.evidenceID && !isPending && (
          <EvidenceVerification
            evidenceId={state.evidenceID}
            type="state"
            entityId={state.id}
            createdAt={state.createdAt}
            createdBy={state.createdBy}
          />
        )}
      </div>
    </div>
  );
}
