'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ItemPassport } from '../../components/ItemPassport';
import { ItemData } from '../../types';
import { useTranslations } from 'next-intl';

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('customer');
  const router = useRouter();
  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string>('');

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setItemId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    const fetchItemData = async () => {
      if (!itemId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/customer/item/${itemId}`);
        if (!response.ok) {
          throw new Error(t('productNotFound'));
        }
        
        const data = await response.json();
        setItemData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorGettingProduct'));
        setItemData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchItemData();
  }, [itemId]);

  const handleBack = () => {
    router.push('/customer');
  };

  if (loading) {
    return (
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
              <p>{t('loadingProduct')}</p>
            </div>
          </div>
        </div>
        <div className="customer-footer">
          <p>{t('copyright')}</p>
        </div>
      </div>
    );
  }

  if (error) {
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
              <h3>{t('error.title')}</h3>
              <p>{error}</p>
              <button className="retry-button" onClick={() => router.push('/customer')}>
                {t('error.backToScanner')}
              </button>
            </div>
          </div>
        </div>
        <div className="customer-footer">
          <p>{t('copyright')}</p>
        </div>
      </div>
    );
  }

  if (!itemData) {
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
              <h3>{t('productNotFound')}</h3>
              <p>{t('productNotFoundMessage')}</p>
              <button className="retry-button" onClick={() => router.push('/customer')}>
                {t('error.backToScanner')}
              </button>
            </div>
          </div>
        </div>
        <div className="customer-footer">
          <p>{t('copyright')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-container">
      <div className="customer-content">
        <div className="passport-section">
          <ItemPassport item={itemData} onBack={handleBack} />
        </div>
      </div>

      <div className="customer-footer">
        <p>{t('copyright')}</p>
      </div>
    </div>
  );
}
