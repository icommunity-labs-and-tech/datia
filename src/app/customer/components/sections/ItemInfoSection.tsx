'use client';

import { useTranslations } from 'next-intl';
import { ItemData } from '../../types';
import { EvidenceVerification } from '../EvidenceVerification';
import { passportStyles } from '../../styles/passportStyles';
import GeolocationMap from '@/components/GeolocationMapClient';

interface ItemInfoSectionProps {
  item: ItemData;
  isMobile: boolean;
}

export function ItemInfoSection({ item, isMobile }: ItemInfoSectionProps) {
  const t = useTranslations('customer');
  return (
    <div>
      <div style={passportStyles.infoSection}>
        <h4 style={passportStyles.infoSectionTitle}>{t('productDetails')}</h4>
        <div style={passportStyles.infoGrid}>
          <div style={isMobile ? passportStyles.infoItemMobile : passportStyles.infoItem}>
            <span style={passportStyles.label}>{t('category')}</span>
            <span style={passportStyles.value}>{item.category?.name || 'N/A'}</span>
          </div>
        </div>
      </div>

      {item.templateFields && Object.keys(item.templateFields).length > 0 && (
        <div style={passportStyles.infoSection}>
          <h4 style={passportStyles.infoSectionTitle}>{t('specifications')}</h4>
          <div style={passportStyles.infoGrid}>
            {Object.entries(item.templateFields).map(([key, value]: [string, unknown]) => {
              const isGeolocation =
                value &&
                typeof value === 'object' &&
                !Array.isArray(value) &&
                'lat' in (value as object) &&
                'lng' in (value as object) &&
                typeof (value as { lat: unknown }).lat === 'number' &&
                typeof (value as { lng: unknown }).lng === 'number';

              return (
                <div key={key} style={isMobile ? passportStyles.infoItemMobile : passportStyles.infoItem}>
                  <span style={passportStyles.label}>{key}:</span>
                  <span style={passportStyles.value}>
                    {isGeolocation ? (
                      <div style={{ marginTop: '0.5rem' }}>
                        <GeolocationMap
                          value={{ lat: (value as { lat: number }).lat, lng: (value as { lng: number }).lng }}
                          readOnly={true}
                        />
                      </div>
                    ) : (
                      String(value)
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {item.evidenceID && (
        <div style={passportStyles.infoSection}>
          <h4 style={passportStyles.infoSectionTitle}>{t('productCertification')}</h4>
          <EvidenceVerification
            evidenceId={item.evidenceID}
            type="item"
            entityId={item.id}
            createdAt={item.createdAt}
            createdBy={item.createdBy}
          />
        </div>
      )}
    </div>
  );
}
