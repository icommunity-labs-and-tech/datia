'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Badge, Button, Group, Loader, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertTriangle, IconArrowLeft, IconArrowRight, IconCheck, IconCircleX, IconShieldCheck } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { checkKycStatus } from '@/actions/kyc/status';

interface KycStepProps {
  companyId: string;
  activationToken: string;
  kycURL: string | null;
  initialStatus: 'NOT_VERIFIED' | 'WAITING' | 'VERIFIED' | 'REJECTED';
  onVerified: () => void;
  onGoToLogin?: () => void;
  onPrevious?: () => void;
}

const POLL_MS = 5000;

export default function KycStep({
  kycURL,
  initialStatus,
  onVerified,
  onPrevious,
}: KycStepProps) {
  const t = useTranslations('onboardingKyc');
  const [verificationStatus, setVerificationStatus] = useState<
    'NOT_VERIFIED' | 'WAITING' | 'VERIFIED' | 'REJECTED'
  >(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusRef = useRef<'NOT_VERIFIED' | 'WAITING' | 'VERIFIED' | 'REJECTED'>(initialStatus);
  const verifiedCalledRef = useRef(false); // Evita llamar a onVerified más de una vez

  // El wizard de iBS vive en su propia pestaña (#146): el iframe daba scroll
  // dentro de scroll y problemas de cámara en algunos navegadores. El webhook
  // de iBS (src/app/api/hooks/signature/ok|ko) es quien actualiza el estado
  // en la BD; esta pestaña solo lo lee — por polling mientras espera, y al
  // momento en cuanto el usuario vuelve a ella.
  const checkStatus = useCallback(async () => {
    try {
      const result = await checkKycStatus();
      if (result.success && result.verificationStatus) {
        const previousStatus = previousStatusRef.current;
        const newStatus = result.verificationStatus;

        setVerificationStatus(newStatus);
        previousStatusRef.current = newStatus;

        if (newStatus === 'VERIFIED') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          if (previousStatus !== 'VERIFIED' && !verifiedCalledRef.current) {
            verifiedCalledRef.current = true;
            setTimeout(() => onVerified(), 1000);
          }
        } else if (newStatus === 'REJECTED') {
          setError(t('rejectedError'));
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }
    } catch (err) {
      console.error('Error checking KYC status:', err);
    }
  }, [onVerified, t]);

  useEffect(() => {
    checkStatus();
    previousStatusRef.current = initialStatus;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El camino rápido: en cuanto el usuario vuelve a esta pestaña (tras
  // completar o abandonar el wizard en la otra), comprobamos ya mismo en vez
  // de esperar al siguiente tick del polling.
  useEffect(() => {
    const recheck = () => {
      if (verificationStatus === 'WAITING') checkStatus();
    };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [verificationStatus, checkStatus]);

  // El polling es solo el respaldo por si el usuario no vuelve a esta
  // pestaña él mismo (p.ej. cierra la del wizard) — el webhook es quien
  // manda, esto es solo para no depender de que el usuario haga nada.
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (verificationStatus === 'WAITING') {
      pollingIntervalRef.current = setInterval(() => checkStatus(), POLL_MS);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [verificationStatus, checkStatus]);

  const handleOpenKyc = () => {
    if (!kycURL) {
      console.error('kycURL is null or undefined');
      return;
    }
    window.open(kycURL, '_blank', 'noopener,noreferrer');
    if (verificationStatus === 'NOT_VERIFIED') {
      setVerificationStatus('WAITING');
      previousStatusRef.current = 'WAITING';
    }
  };

  const handleContinue = () => {
    if (verificationStatus === 'VERIFIED') {
      onVerified();
    }
  };

  if (!kycURL) {
    return (
      <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />} title={t('urlMissing.title')}>
        {t('urlMissing.body')}
      </Alert>
    );
  }

  const primaryButtonStyle = { height: 44 };

  return (
    <Stack gap="md">
      {verificationStatus !== 'VERIFIED' && verificationStatus !== 'REJECTED' && (
        <Stack align="center" gap="sm">
          <ThemeIcon size={72} radius="xl" color="datiaBlue" variant="light">
            <IconShieldCheck size={36} stroke={1.6} />
          </ThemeIcon>
          <Title order={3}>{t('title')}</Title>
        </Stack>
      )}

      {error && (
        <Alert
          color="red"
          variant="light"
          withCloseButton
          onClose={() => setError(null)}
          icon={<IconCircleX size={18} />}
        >
          {error}
        </Alert>
      )}

      {verificationStatus === 'NOT_VERIFIED' && (
        <Stack gap="sm">
          <Button onClick={handleOpenKyc} fullWidth style={primaryButtonStyle} leftSection={<IconShieldCheck size={18} />}>
            {t('start')}
          </Button>
          <Text size="sm" c="dimmed" ta="center">{t('waitHint')}</Text>
          {onPrevious && (
            <Button variant="default" onClick={onPrevious} fullWidth leftSection={<IconArrowLeft size={16} />}>
              {t('previous')}
            </Button>
          )}
        </Stack>
      )}

      {verificationStatus === 'WAITING' && (
        <Stack gap="sm">
          <Group justify="center" gap="xs">
            <Loader size="xs" />
            <Text size="sm" c="dimmed">{t('checking')}</Text>
          </Group>
          <Text size="sm" ta="center">{t('waitingBody')}</Text>
          <Button variant="light" onClick={handleOpenKyc} fullWidth leftSection={<IconShieldCheck size={18} />}>
            {t('reopen')}
          </Button>
          {onPrevious && (
            <Button variant="default" onClick={onPrevious} fullWidth leftSection={<IconArrowLeft size={16} />}>
              {t('previous')}
            </Button>
          )}
        </Stack>
      )}

      {verificationStatus === 'VERIFIED' && (
        <Stack align="center" gap="sm">
          <Badge color="green" variant="light" size="lg" leftSection={<IconCheck size={14} />}>
            {t('verified')}
          </Badge>
          <Button color="green" onClick={handleContinue} fullWidth style={primaryButtonStyle} rightSection={<IconArrowRight size={16} />}>
            {t('continue')}
          </Button>
          {onPrevious && (
            <Button variant="default" onClick={onPrevious} fullWidth leftSection={<IconArrowLeft size={16} />}>
              {t('previous')}
            </Button>
          )}
        </Stack>
      )}

      {verificationStatus === 'REJECTED' && (
        <Alert color="red" variant="light" icon={<IconCircleX size={18} />} title={t('rejected.title')}>
          {t('rejected.body')}
        </Alert>
      )}
    </Stack>
  );
}
