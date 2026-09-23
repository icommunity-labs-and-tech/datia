'use client';

import { Alert, Badge, Button, Card, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconClock, IconInfoCircle, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { retryOrganizationKyc } from '@/actions/organizations/retry-organization-kyc';

interface Props {
  organization: {
    name: string;
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
    <Card p="lg" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" c="dimmed">{t('kyc.organization').replace(':', '')}</Text>
          <Text size="sm" fw={550}>{organization.name}</Text>
        </Group>
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" c="dimmed">{t('kyc.status').replace(':', '')}</Text>
          <Badge variant="light" color={badgeColor}>{statusLabel}</Badge>
        </Group>
      </Stack>

      {status !== 'VERIFIED' && (
        <Stack gap="md" mt="md">
          <Alert
            variant="light"
            color={status === 'REJECTED' ? 'red' : 'yellow'}
            radius="md"
            title={status === 'REJECTED' ? t('kyc.rejectedTitle') : t('kyc.pendingTitle')}
            icon={status === 'REJECTED' ? <IconAlertTriangle size={16} /> : <IconClock size={16} />}
          >
            <Text size="sm">
              {status === 'REJECTED' ? t('kyc.rejectedDescription') : t('kyc.pendingDescription')}
            </Text>
            {status === 'WAITING' && (
              <Text size="xs" mt="xs" c="dimmed">{t('kyc.waitingNote')}</Text>
            )}
          </Alert>

          <Button
            color={status === 'REJECTED' ? 'red' : undefined}
            variant={status === 'REJECTED' ? 'filled' : 'default'}
            size="xs"
            onClick={handleRetryKyc}
            loading={retrying}
            leftSection={<IconRefresh size={15} stroke={1.7} />}
            style={{ alignSelf: 'flex-start' }}
          >
            {retrying ? t('kyc.retrying') : t('kyc.retry')}
          </Button>

          {retryError && <Alert color="red" variant="light" radius="md">{retryError}</Alert>}

          <Group gap={6} wrap="nowrap" align="flex-start">
            <IconInfoCircle size={14} stroke={1.7} style={{ marginTop: 2, flexShrink: 0, color: 'var(--mantine-color-gray-5)' }} />
            <Text size="xs" c="dimmed">{t('kyc.needKycNote')}</Text>
          </Group>
        </Stack>
      )}

      {status === 'VERIFIED' && (
        <Alert color="green" variant="light" radius="md" mt="md" icon={<IconCircleCheck size={16} />}>
          <Text size="sm">{t('kyc.verifiedMessage')}</Text>
        </Alert>
      )}
    </Card>
  );
}
