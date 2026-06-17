'use client';
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ItemData, EnergyCertification } from '../types';
import { AntifraudPanel } from './AntifraudPanel';
import { ItemInfoSection } from './sections/ItemInfoSection';
import { ItemHistorySection } from './sections/ItemHistorySection';
import { VerifiedBadge } from './ui';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { formatDate } from '../utils/dateFormatters';
import { passportStyles } from '../styles/passportStyles';

function EnergyCertificationPanel({ certifications }: { certifications: EnergyCertification[] }) {
  const totalCo2 = certifications.reduce((s, c) => s + c.co2eKg, 0);
  const totalKwh = certifications.reduce((s, c) => s + c.consumptionKwh, 0);

  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140, background: '#f0fdf4', borderRadius: 8, padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d' }}>{totalCo2.toFixed(2)}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>kg CO₂e certificados</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: '#eff6ff', borderRadius: 8, padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1d4ed8' }}>{totalKwh.toFixed(2)}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>kWh consumidos</div>
        </div>
      </div>

      {certifications.map((cert) => (
        <div key={cert.id} style={{ border: '1px solid #d1fae5', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem', background: '#f9fafb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600, color: '#111827' }}>{cert.co2eKg.toFixed(3)} kg CO₂e</span>
            <span style={{ fontSize: '0.75rem', background: '#d1fae5', color: '#065f46', borderRadius: 4, padding: '2px 8px' }}>
              ✓ {cert.scope?.replace('_', ' ')}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
            <span>Período: {new Date(cert.periodStart).toLocaleDateString()} – {new Date(cert.periodEnd).toLocaleDateString()}</span>
            <span>Consumo: {cert.consumptionKwh} kWh ({cert.energyCarrier})</span>
            {cert.calculationMethodology && <span>Método: {cert.calculationMethodology}</span>}
            {cert.verifierBody && <span>Verificador: {cert.verifierBody}</span>}
            {cert.verificationStandard && <span>Estándar: {cert.verificationStandard}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ItemPassportProps {
  item: ItemData;
  onBack: () => void;
  showFraudReport?: boolean;
}

export function ItemPassport({ item, onBack, showFraudReport = false }: ItemPassportProps) {
  const t = useTranslations('common');
  const tCustomer = useTranslations('customer');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'antifraud' | 'energy'>('info');
  const isMobile = useMobileDetection();

  // Determinar si se debe mostrar la pestaña de antifalsificación
  const hasEvidence = item.antifraudEvidenceId && item.antifraudEvidenceId !== 'NO_SIGNATURE';
  const shouldShowAntifraud = hasEvidence || item.isFirstVerification;
  const verifiedEmissions = item.energyCertifications?.filter(e => e.verificationStatus === 'VERIFIED') ?? [];
  const showEnergy = verifiedEmissions.length > 0;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/customer');
    }
  };

  return (
    <div style={passportStyles.container}>
      <div style={passportStyles.header}>
        <button style={passportStyles.backButton} onClick={handleBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {t('actions.back')}
        </button>
        <h2 style={passportStyles.headerTitle}>{tCustomer('productInfo')}</h2>
      </div>

      <div style={passportStyles.card}>
        {/* Item Header */}
        <div style={passportStyles.itemHeader}>
          <div style={passportStyles.itemImage}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={passportStyles.placeholderImage}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '2rem', height: '2rem' }}>
                  <path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
          </div>
          <div style={passportStyles.itemInfo}>
            <h3
              style={{
                ...passportStyles.itemTitle,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {item.name}
              {item.evidenceID && <VerifiedBadge title={tCustomer('verifiedProduct')} />}
            </h3>
            <p style={passportStyles.itemDescription}>{item.description || t('noDescription')}</p>
            <div style={passportStyles.itemMeta}>
              <span>ID: {item.id}</span>
              <span>{tCustomer('createdAt')} {formatDate(item.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (solo escritorio) */}
        {!isMobile && (
          <div style={passportStyles.tabs}>
            <button
              style={{
                ...passportStyles.tab,
                ...(activeTab === 'info' ? passportStyles.tabActive : {}),
              }}
              onClick={() => setActiveTab('info')}
            >
              {tCustomer('tabInfo')}
            </button>
            <button
              style={{
                ...passportStyles.tab,
                ...(activeTab === 'history' ? passportStyles.tabActive : {}),
              }}
              onClick={() => setActiveTab('history')}
            >
              {tCustomer('tabHistory')}
            </button>
            {shouldShowAntifraud && (
              <button
                style={{
                  ...passportStyles.tab,
                  ...(activeTab === 'antifraud' ? passportStyles.tabActive : {}),
                }}
                onClick={() => setActiveTab('antifraud')}
              >
                {tCustomer('tabAntifraud')}
              </button>
            )}
            {showEnergy && (
              <button
                style={{
                  ...passportStyles.tab,
                  ...(activeTab === 'energy' ? passportStyles.tabActive : {}),
                }}
                onClick={() => setActiveTab('energy')}
              >
                🌿 {tCustomer('tabEnergy')}
              </button>
            )}
          </div>
        )}

        {/* Tab / Mobile Content */}
        <div style={passportStyles.tabContent}>
          {isMobile ? (
            <>
              <ItemInfoSection item={item} isMobile={isMobile} />
              <div style={{ height: '1rem' }} />
              <ItemHistorySection states={item.states} />
              {shouldShowAntifraud && (
                <>
                  <div style={{ height: '1rem' }} />
                  <AntifraudPanel item={item} showFraudReport={showFraudReport} />
                </>
              )}
              {showEnergy && (
                <>
                  <div style={{ height: '1rem' }} />
                  <EnergyCertificationPanel certifications={verifiedEmissions} />
                </>
              )}
            </>
          ) : (
            <>
              {activeTab === 'info' && <ItemInfoSection item={item} isMobile={isMobile} />}
              {activeTab === 'history' && <ItemHistorySection states={item.states} />}
              {activeTab === 'antifraud' && shouldShowAntifraud && <AntifraudPanel item={item} showFraudReport={showFraudReport} />}
              {activeTab === 'energy' && showEnergy && <EnergyCertificationPanel certifications={verifiedEmissions} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
