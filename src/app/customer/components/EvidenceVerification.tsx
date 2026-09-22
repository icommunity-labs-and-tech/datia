'use client';

import { useEffect, useState } from 'react';
import { Alert, Group, Loader, SimpleGrid, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { SignerBadge, BlockchainLink } from './ui';
import { retryFetch } from '../utils/apiRetry';

interface EvidenceVerificationProps {
  evidenceId: string;
  entityId: string;
  createdAt?: string;
  createdBy?: { name: string; email: string } | null;
}

export function EvidenceVerification({ evidenceId, entityId, createdAt: _createdAt, createdBy }: EvidenceVerificationProps) {
  const t = useTranslations('customer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [majorNetwork, setMajorNetwork] = useState<{ name: string; url?: string } | null>(null);

  useEffect(() => {
    if (!evidenceId) return;

    const endpoint = `/api/checker/item/${encodeURIComponent(entityId)}`;

    let cancelled = false;

    // Use retryFetch with exponential backoff and circuit breaker
    retryFetch<{ data?: { certification?: { network?: string; links?: { checker?: string } }; links?: { checker?: string } }; links?: { checker?: string } }>(
      endpoint,
      {},
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 8000,
        timeout: 30000,
      }
    )
      .then((data) => {
        if (cancelled) return;

        const cert = data?.data?.certification || {};
        const checkerUrlFromApi = cert?.links?.checker ||
                                  data?.data?.links?.checker ||
                                  data?.links?.checker ||
                                  null;
        const checkerUrl = checkerUrlFromApi || `https://checker.icommunitylabs.com/lookup/${evidenceId}`;

        if (cert?.network) {
          setMajorNetwork({ name: cert.network, url: checkerUrl });
        } else {
          setMajorNetwork({ name: 'Blockchain', url: checkerUrl });
        }
      })
      .catch((e: Error) => {
        if (cancelled) return;
        if (e.name !== 'AbortError') {
          setError(e.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [evidenceId, entityId]);

  if (loading) {
    return (
      <Group gap="xs" py="sm">
        <Loader size="xs" />
        <Text size="sm" c="dimmed">{t('verifyingEvidence')}</Text>
      </Group>
    );
  }

  if (error) {
    return (
      <Alert
        color="red"
        variant="light"
        radius="md"
        icon={<IconAlertTriangle size={16} />}
        title={t('certificationError')}
        mt="sm"
      >
        <Text size="xs">{error}</Text>
      </Alert>
    );
  }

  if (!createdBy && !majorNetwork?.url) {
    return null;
  }

  return (
    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs" mt="sm">
      {createdBy && <SignerBadge name={createdBy.name} />}
      {majorNetwork?.url && <BlockchainLink href={majorNetwork.url} label={majorNetwork.name} />}
    </SimpleGrid>
  );
}
