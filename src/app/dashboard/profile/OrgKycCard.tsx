'use client';

import { Card, Alert, Badge, Button, Spinner } from 'react-bootstrap';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { retryOrganizationKyc } from '@/actions/organizations/retry-organization-kyc';

interface Props {
  organization: {
    nombre: string;
    verificationStatus: string;
    kycURL?: string | null;
  };
}

export default function OrgKycCard({ organization }: Props) {
  const t = useTranslations('profile');
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [status, setStatus] = useState(organization.verificationStatus);

  const handleRetryKyc = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const result = await retryOrganizationKyc();
      if (result.success) {
        if (result.kycURL) {
          window.open(result.kycURL, '_blank', 'noopener,noreferrer');
          if (status === 'REJECTED') setStatus('WAITING');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          setRetryError(t('kyc.noUrlError'));
        }
      } else {
        setRetryError(result.error || t('kyc.retry'));
      }
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : t('kyc.noUrlError'));
    } finally {
      setRetrying(false);
    }
  };

  const badgeVariant =
    status === 'VERIFIED' ? 'success' :
    status === 'WAITING' ? 'warning' :
    status === 'REJECTED' ? 'danger' : 'secondary';

  const statusLabel =
    status === 'VERIFIED' ? t('kyc.verified') :
    status === 'WAITING' ? t('kyc.waiting') :
    status === 'REJECTED' ? t('kyc.rejected') : t('kyc.notVerified');

  return (
    <Card className="mb-3">
      <Card.Body>
        <h6 className="card-title">{t('kyc.orgVerificationStatus')}</h6>
        <div className="mb-3">
          <strong>{t('kyc.organization')}</strong> {organization.nombre}
        </div>
        <div className="mb-3">
          <strong>{t('kyc.status')}</strong>{' '}
          <Badge bg={badgeVariant}>{statusLabel}</Badge>
        </div>

        {status !== 'VERIFIED' && (
          <>
            <Alert variant={status === 'REJECTED' ? 'danger' : 'warning'} className="mb-3">
              <Alert.Heading>
                <i className={`bi bi-${status === 'REJECTED' ? 'x-circle' : 'clock'}-fill me-2`} />
                {status === 'REJECTED' ? t('kyc.rejectedTitle') : t('kyc.pendingTitle')}
              </Alert.Heading>
              <p className="mb-0">
                {status === 'REJECTED' ? t('kyc.rejectedDescription') : t('kyc.pendingDescription')}
              </p>
              {status === 'WAITING' && (
                <p className="mb-0 mt-2 small">
                  <i className="bi bi-info-circle me-1" />
                  {t('kyc.waitingNote')}
                </p>
              )}
            </Alert>

            <div className="d-flex gap-2 flex-wrap">
              <Button
                variant={status === 'REJECTED' ? 'danger' : 'outline-primary'}
                onClick={handleRetryKyc}
                disabled={retrying}
              >
                {retrying ? (
                  <><Spinner size="sm" className="me-2" />{t('kyc.retrying')}</>
                ) : (
                  <><i className="bi bi-arrow-clockwise me-2" />{t('kyc.retry')}</>
                )}
              </Button>
            </div>

            {retryError && <Alert variant="danger" className="mt-3">{retryError}</Alert>}

            <p className="text-muted small mt-3 mb-0">
              <i className="bi bi-info-circle me-1" />
              {t('kyc.needKycNote')}
            </p>
          </>
        )}

        {status === 'VERIFIED' && (
          <Alert variant="success">
            <i className="bi bi-check-circle-fill me-2" />
            {t('kyc.verifiedMessage')}
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
}
