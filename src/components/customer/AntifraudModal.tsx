'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import './antifraud.css';

interface AntifraudModalProps {
  isFirstVerification: boolean;
  evidenceID?: string;
  onClose: () => void;
}

export function AntifraudModal({ isFirstVerification, onClose }: AntifraudModalProps) {
  const t = useTranslations('customer');

  // Solo mostrar modal en primera verificación
  if (!isFirstVerification) {
    return null;
  }

  return (
    <div className="antifraud-modal-overlay" onClick={onClose}>
      <div className="antifraud-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="antifraud-modal-success">
          <div className="antifraud-modal-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2>{t('firstVerificationTitle')}</h2>
          <p>{t('firstVerificationDescription')}</p>
          <p>{t('firstVerificationDisclaimer')}</p>
          <button className="antifraud-modal-button" onClick={onClose}>
            {t('understood')}
          </button>
        </div>
      </div>
    </div>
  );
}

