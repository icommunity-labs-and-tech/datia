'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function CustomerPage() {
  const t = useTranslations('customer');
  const router = useRouter();

  // Scanner functionality is now handled by the unified scanner page

  const handleManualInput = useCallback(async (code: string) => {
    if (code.trim()) {
      // Navegar directamente a la página del item
      router.push(`/customer/item/${code}`);
    }
  }, [router]);

  return (
    <div className="customer-container">
      <div className="customer-content">
        <div className="scan-section">
          <div className="scan-card">
            <div className="scan-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9h6v12H3z"/>
                <path d="M15 3h6v18h-6z"/>
                <path d="M9 3h6v18H9z"/>
              </svg>
            </div>
            <h2>{t('scanCode')}</h2>
            <p>{t('scanDescription')}</p>
            
            <div className="scan-actions">
              <div className="manual-input">
                <input
                  type="text"
                  placeholder={t('manualInput')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleManualInput(e.currentTarget.value);
                    }
                  }}
                />
                <button 
                  className="manual-button"
                  onClick={() => {
                    const input = document.querySelector('.manual-input input') as HTMLInputElement;
                    if (input) handleManualInput(input.value);
                  }}
                >
                  {t('search')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scanner functionality is now handled by the unified scanner page */}
      </div>

      <div className="customer-footer">
        <p>{t('copyright')}</p>
      </div>
    </div>
  );
}
