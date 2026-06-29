'use client';

import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Box from '@/components/Box';
import BoxHeader from '@/components/BoxHeader';
import DownloadZipButton from '@/components/DownloadZipButton';
import ItemSelectionModal from '@/components/ItemSelectionModal';
import { exportItemQRCodes, exportItemsExcel } from '@/actions/exports';
import { useTranslations } from 'next-intl';

export default function ExportQrsPageClient() {
  const t = useTranslations('exportQrsPage');
  const [showPassportModal, setShowPassportModal] = useState(false);

  const getPassportQrZip = async (selectedItemIds: string[], items: any[]) => {
    const ids = selectedItemIds.length ? selectedItemIds : items.map((it: any) => it.id);
    return exportItemQRCodes({ itemIds: ids });
  };

  const getPassportExcel = async (selectedItemIds: string[], items: any[]) => {
    const ids = selectedItemIds.length ? selectedItemIds : items.map((it: any) => it.id);
    return exportItemsExcel({ itemIds: ids });
  };

  return (
    <>
      <Box>
        <BoxHeader title={t('pageTitle')} icon="bi-qr-code" />
        <p className="text-muted small mb-3">{t('infoDescription')}</p>

        <div className="row g-3 mb-3">
          {/* Passport QRs card */}
          <div className="col-md-6">
            <div className="border rounded p-4 h-100 d-flex flex-column">
              <div className="text-center mb-3">
                <i className="bi bi-passport text-primary" style={{ fontSize: '2rem' }} />
              </div>
              <h5 className="text-center mb-2">{t('passportQrsTitle')}</h5>
              <p className="text-muted small text-center mb-3">{t('infoPassportFlow')}</p>

              {/* Flow diagram */}
              <div className="d-flex align-items-center justify-content-center gap-2 mb-3 flex-wrap">
                {[
                  { icon: 'bi-qr-code', label: t('flowPassportNode1') },
                  { icon: 'bi-passport', label: t('flowPassportNode2') },
                  { icon: 'bi-info-circle', label: t('flowPassportNode3') },
                ].map((node, i, arr) => (
                  <div key={i} className="d-flex align-items-center gap-2">
                    <div className="text-center">
                      <div
                        className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center mx-auto"
                        style={{ width: 48, height: 48 }}
                      >
                        <i className={`bi ${node.icon} text-primary`} style={{ fontSize: '1.2rem' }} />
                      </div>
                      <div className="small mt-1" style={{ fontSize: '0.7rem', lineHeight: 1.2 }}>{node.label}</div>
                    </div>
                    {i < arr.length - 1 && (
                      <i className="bi bi-arrow-right text-muted" style={{ fontSize: '0.9rem', marginTop: '-1rem' }} />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <Button
                  variant="primary"
                  className="w-100 d-flex align-items-center justify-content-center"
                  onClick={() => setShowPassportModal(true)}
                >
                  <i className="bi bi-qr-code me-2" />
                  {t('exportPassportQrs')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Box>

      <ItemSelectionModal
        show={showPassportModal}
        onHide={() => setShowPassportModal(false)}
        title={t('selectProductsPassport')}
        footer={(selectedItemIds, items) => (
          <>
            <Button variant="secondary" onClick={() => setShowPassportModal(false)}>
              {t('cancel')}
            </Button>
            <DownloadZipButton
              label={t('exportAsZip')}
              iconClassName="bi bi-file-zip me-2"
              variant="primary"
              getZip={() => getPassportQrZip(selectedItemIds, items)}
            />
            <DownloadZipButton
              label={t('exportAsExcel')}
              iconClassName="bi bi-file-earmark-spreadsheet me-2"
              variant="success"
              getZip={() => getPassportExcel(selectedItemIds, items)}
            />
          </>
        )}
      />
    </>
  );
}
