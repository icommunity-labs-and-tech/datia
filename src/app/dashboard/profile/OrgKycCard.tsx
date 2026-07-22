'use client';

import { Card, Alert, Badge, Button, Loader, Group, Text, Title } from '@mantine/core';
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

  const badgeColor =
    status === 'VERIFIED' ? 'green' :
    status === 'WAITING' ? 'yellow' :
    status === 'REJECTED' ? 'red' : 'gray';

  const statusLabel =
    status === 'VERIFIED' ? t('kyc.verified') :
    status === 'WAITING' ? t('kyc.waiting') :
    status === 'REJECTED' ? t('kyc.rejected') : t('kyc.notVerified');

  return (
    <Card mb="md">
        <Title order={6} mb="xs">{t('kyc.orgVerificationStatus')}</Title>
        <Text size="sm" mb="sm">
          <strong>{t('kyc.organization')}</strong> {organization.nombre}
        </Text>
        <Text size="sm" mb="md" component="div">
          <strong>{t('kyc.status')}</strong>{' '}
          <Badge color={badgeColor}>{statusLabel}</Badge>
        </Text>

        {status !== 'VERIFIED' && (
          <>
            <Alert
              color={status === 'REJECTED' ? 'red' : 'yellow'}
              mb="md"
              title={status === 'REJECTED' ? t('kyc.rejectedTitle') : t('kyc.pendingTitle')}
              icon={<i className={`bi bi-${status === 'REJECTED' ? 'x-circle' : 'clock'}-fill`} />}
            >
              {status === 'REJECTED' ? t('kyc.rejectedDescription') : t('kyc.pendingDescription')}
              {status === 'WAITING' && (
                <Text size="xs" mt="xs">
                  <i className="bi bi-info-circle" style={{ marginRight: 4 }} />
                  {t('kyc.waitingNote')}
                </Text>
              )}
            </Alert>

            <Group gap="xs">
              <Button
                color={status === 'REJECTED' ? 'red' : undefined}
                variant={status === 'REJECTED' ? 'filled' : 'default'}
                onClick={handleRetryKyc}
                disabled={retrying}
                leftSection={retrying ? <Loader size="xs" /> : <i className="bi bi-arrow-clockwise" />}
              >
                {retrying ? t('kyc.retrying') : t('kyc.retry')}
              </Button>
            </Group>

            {retryError && <Alert color="red" mt="md">{retryError}</Alert>}

            <Text size="xs" c="dimmed" mt="md">
              <i className="bi bi-info-circle" style={{ marginRight: 4 }} />
              {t('kyc.needKycNote')}
            </Text>
          </>
        )}

        {status === 'VERIFIED' && (
          <Alert color="green" icon={<i className="bi bi-check-circle-fill" />}>
            {t('kyc.verifiedMessage')}
          </Alert>
        )}
    </Card>
  );
}
