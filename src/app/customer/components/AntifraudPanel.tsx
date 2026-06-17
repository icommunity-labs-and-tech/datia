'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { ItemData } from '../types';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { formatFullDateTime } from '../utils/dateFormatters';
import { StatusCard } from './ui/StatusCard';
import { ReportFraudButton } from './ReportFraudButton';

interface AntifraudPanelProps {
  item: ItemData;
  showFraudReport?: boolean;
}

interface EvidenceDetails {
  verificationDate?: string;
  evidenceDate?: string;
  ipAddress?: string;
  userAgent?: string;
  loading: boolean;
  error?: string;
}

const styles = {
  infoGrid: {
    display: 'grid',
    gap: '1rem',
  },
  infoItem: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr',
    alignItems: 'start',
    columnGap: '1.5rem',
    rowGap: '0.25rem',
    padding: '0.75rem 0',
    borderBottom: '1px solid #f1f5f9',
  },
  infoItemMobile: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '0.5rem',
    padding: '0.75rem 0',
    borderBottom: '1px solid #f1f5f9',
  },
  infoItemLast: {
    borderBottom: 'none',
  },
  label: {
    fontWeight: '500',
    color: '#64748b',
    fontSize: '0.875rem',
    paddingTop: '0.125rem',
  },
  value: {
    color: '#1e293b',
    fontSize: '0.875rem',
    fontWeight: '500',
    lineHeight: '1.6',
    wordBreak: 'break-word',
  } as React.CSSProperties,
  warningText: {
    background: 'rgba(245, 158, 11, 0.1)',
    padding: '0.625rem 0.875rem',
    borderRadius: '6px',
    color: '#92400e',
    fontSize: '0.8125rem',
    lineHeight: '1.5',
    marginTop: '1.5rem',
    fontWeight: '400',
  },
  evidenceDetails: {
    marginTop: '1.5rem',
  },
};

const getIbsUrl = (evidenceId: string) => `https://checker.icommunitylabs.com/lookup/${evidenceId}`;

export function AntifraudPanel({ item, showFraudReport = false }: AntifraudPanelProps) {
  const t = useTranslations('customer');
  const [evidenceDetails, setEvidenceDetails] = useState<EvidenceDetails>({ loading: false });
  const isMobile = useMobileDetection();

  useEffect(() => {
    if (!item.antifraudEvidenceId || item.antifraudEvidenceId === 'NO_SIGNATURE') {
      return;
    }

    const fetchEvidenceDetails = async () => {
      setEvidenceDetails({ loading: true });
      try {
        const evidenceId = item.antifraudEvidenceId!;
        const response = await fetch(`/api/customer/antifraud-evidence/${encodeURIComponent(evidenceId)}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `Error ${response.status}: No se pudo obtener la evidencia`);
        }

        const data = await response.json();
        setEvidenceDetails({
          verificationDate: data.verificationDate,
          evidenceDate: data.evidenceDate,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          loading: false,
        });
      } catch (error) {
        setEvidenceDetails({
          loading: false,
          error: error instanceof Error ? error.message : t('errorLoadingEvidence'),
        });
      }
    };

    fetchEvidenceDetails();
  }, [item.antifraudEvidenceId, t]);

  const renderEvidenceDetails = () => {
    if (!item.antifraudEvidenceId || item.antifraudEvidenceId === 'NO_SIGNATURE') {
      return null;
    }

    if (evidenceDetails.loading) {
      return (
        <div style={styles.evidenceDetails}>
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{t('loadingInfo')}</div>
        </div>
      );
    }

    if (evidenceDetails.error) {
      return null;
    }

    return (
      <div style={styles.evidenceDetails}>
        <div style={styles.infoGrid}>
          {evidenceDetails.verificationDate && (
            <div style={isMobile ? styles.infoItemMobile : styles.infoItem}>
              <span style={styles.label}>{t('registrationDate')}</span>
              <span style={styles.value}>{formatFullDateTime(evidenceDetails.verificationDate)}</span>
            </div>
          )}
          {evidenceDetails.evidenceDate && (
            <div style={{ ...(isMobile ? styles.infoItemMobile : styles.infoItem), ...styles.infoItemLast }}>
              <span style={styles.label}>{t('evidenceDate')}</span>
              <span style={styles.value}>{formatFullDateTime(evidenceDetails.evidenceDate)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const hasValidEvidence = item.antifraudEvidenceId && item.antifraudEvidenceId !== 'NO_SIGNATURE';

  // Solo mostrar el panel si:
  // 1. El item tiene evidencia de verificación (ya fue verificado), O
  // 2. Es la primera verificación (acabamos de verificar en /verify)
  // Si no hay evidencia Y no es primera verificación, no mostrar nada
  if (!hasValidEvidence && !item.isFirstVerification) {
    return null;
  }

  if (item.isFirstVerification) {
    return null;
  }

  return (
    <StatusCard
      variant="info"
      title={t('verificationInfo')}
      description={
        <div style={{ fontSize: '0.9375rem', lineHeight: '1.7' }}>
          <p style={{ margin: '0 0 1rem 0' }}>{t('previouslyRegistered')}</p>
          <p style={{ margin: '0 0 1rem 0' }}>
            <strong>{t('verificationFlow')}</strong> {t('verificationFlowDescription')}
          </p>
          <p style={{ margin: '0' }}>{t('alreadyVerified')}</p>
        </div>
      }
      link={hasValidEvidence ? { href: getIbsUrl(item.antifraudEvidenceId!), label: t('viewEvidence') } : undefined}
      footer={
        <>
          <div style={styles.warningText}>{t('verificationWarning')}</div>
          {showFraudReport && <ReportFraudButton itemId={item.id} />}
        </>
      }
    >
      {renderEvidenceDetails()}
    </StatusCard>
  );
}
