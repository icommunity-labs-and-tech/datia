'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';

function ErrorPageContent() {
  const t = useTranslations('customer.error');
  const tCustomer = useTranslations('customer');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const error = searchParams.get('error') || t('unknownError');
  const code = searchParams.get('code') || '';

  const handleRetry = () => {
    router.push('/customer');
  };

  const handleManualSearch = () => {
    if (code) {
      router.push(`/customer/item/${code}`);
    } else {
      router.push('/customer');
    }
  };

  return (
    <div className="customer-container">
      <div className="customer-content">
        <div className="error-section">
          <div className="error-card">
            <div className="error-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M15 9l-6 6M9 9l6 6"/>
              </svg>
            </div>
            <h3>{t('title')}</h3>
            <p>{error}</p>
            
            <div className="error-actions">
              <button className="retry-button" onClick={handleRetry}>
                {t('backToScanner')}
              </button>
              
              {code && (
                <button className="manual-button" onClick={handleManualSearch}>
                  {t('tryWithCode', { code })}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="customer-footer">
        <p>{tCustomer('copyright')}</p>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  const t = useTranslations('customer.error');
  const tCustomer = useTranslations('customer');
  return (
    <Suspense fallback={
      <div className="customer-container">
        <div className="customer-content">
          <div className="loading-section">
            <div className="loading-card">
              <div className="loading-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
              </div>
              <h2>{t('loading')}</h2>
              <p>{t('preparingError')}</p>
            </div>
          </div>
        </div>
        <div className="customer-footer">
          <p>{tCustomer('copyright')}</p>
        </div>
      </div>
    }>
      <ErrorPageContent />
    </Suspense>
  );
}
