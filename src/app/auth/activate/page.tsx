'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Anchor, Box, Button, Center, Divider, Group, Loader, Paper, PasswordInput, Progress, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconCheck, IconCircleCheck, IconCircleX, IconInfoCircle, IconLock, IconUserCheck } from '@tabler/icons-react';
import { getOnboardingInfo } from '@/actions/organizations/get-onboarding-info';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import KycStep from '@/components/onboarding/KycStep';
import Logo from '@/components/Logo';
import { useTranslations } from 'next-intl';

type OnboardingStep = 1 | 2 | 3 | 4;

function ActivateAccountForm() {
  const t = useTranslations('auth.activate');
  const tCommon = useTranslations('common.actions');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Estados para información de onboarding
  const [onboardingInfo, setOnboardingInfo] = useState<{
    isFirstAdmin: boolean;
    role: string;
    userName: string;
    organizationName: string;
    organizationId: string;
    companyId: string | null;
    kycURL: string | null;
    verificationStatus: 'NOT_VERIFIED' | 'WAITING' | 'VERIFIED' | 'REJECTED';
  } | null>(null);

  // Estados del formulario
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Estado del wizard (solo para primer admin)
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [isKycEmbedded, setIsKycEmbedded] = useState(false);

  // Función para obtener la clave de localStorage
  const getStorageKey = () => {
    return token ? `onboarding_${token}` : null;
  };

  // Función para guardar el estado del onboarding
  const saveOnboardingState = (step: OnboardingStep, passwordSet: boolean) => {
    const storageKey = getStorageKey();
    if (!storageKey) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        step,
        passwordSet,
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.error('Error saving onboarding state:', err);
    }
  };

  // Función para cargar el estado del onboarding
  const loadOnboardingState = (): { step: OnboardingStep; passwordSet: boolean } | null => {
    const storageKey = getStorageKey();
    if (!storageKey) return null;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verificar que no sea muy antiguo (más de 7 días)
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (parsed.timestamp && parsed.timestamp > sevenDaysAgo) {
          return {
            step: parsed.step || 1,
            passwordSet: parsed.passwordSet || false,
          };
        }
      }
    } catch (err) {
      console.error('Error loading onboarding state:', err);
    }
    return null;
  };

  // Función para limpiar el estado guardado
  const clearOnboardingState = () => {
    const storageKey = getStorageKey();
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        console.error('Error clearing onboarding state:', err);
      }
    }
  };

  // Cargar información de onboarding al montar
  useEffect(() => {
    const loadOnboardingInfo = async () => {
      if (!token) {
        setError(t('error.invalidToken'));
        setValidating(false);
        return;
      }

      try {
        const result = await getOnboardingInfo(token);
        if (!result.success || !result.info) {
          setError(result.error || t('error.loadError'));
          setValidating(false);
          return;
        }

        const info = result.info;

        // Verificar token
        if (!info.tokenValid) {
          setError(t('error.invalidToken'));
          setValidating(false);
          return;
        }

        if (info.tokenExpired) {
          setError(t('error.expiredToken'));
          setValidating(false);
          return;
        }

        if (info.alreadyActivated) {
          // Si ya está activado, limpiar estado guardado y redirigir. La cuenta
          // de organización (sin empresa) tiene su propio panel.
          clearOnboardingState();
          const loginPath = info.role === 'ORG_ADMIN' ? '/auth/organization/login' : '/auth/admin/login';
          router.push(`${loginPath}?message=account-activated`);
          return;
        }

        setTokenValid(true);
        setOnboardingInfo({
          isFirstAdmin: info.isFirstAdmin,
          role: info.role,
          userName: info.userName,
          organizationName: info.organizationName,
          organizationId: info.organizationId,
          companyId: info.companyId,
          kycURL: info.kycURL,
          verificationStatus: info.verificationStatus,
        });

        // Si es primer admin, restaurar estado guardado
        if (info.isFirstAdmin) {
          const savedState = loadOnboardingState();
          if (savedState) {
            // Determinar el paso correcto basado en el estado guardado y el estado real
            let restoredStep: OnboardingStep = savedState.step;
            
            // Si el KYC ya está verificado, ir al paso 4 (completado)
            if (info.verificationStatus === 'VERIFIED') {
              restoredStep = 4;
              setAccountActivated(true);
            }
            // Si guardó la contraseña pero no completó KYC, ir al paso 3 (KYC)
            else if (savedState.passwordSet && restoredStep < 3) {
              restoredStep = 3;
            }
            // Si estaba en paso 1 pero guardó contraseña, ir al paso 2
            else if (savedState.passwordSet && restoredStep === 1) {
              restoredStep = 2;
            }

            setCurrentStep(restoredStep);
            setPasswordSaved(savedState.passwordSet);
          }
        }
      } catch (err) {
        console.error('Error loading onboarding info:', err);
        setError(t('error.loadError'));
      } finally {
        setValidating(false);
      }
    };

    loadOnboardingInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, router, t]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('password.errors.passwordsDontMatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('password.errors.minLength'));
      return;
    }

    // Si es primer admin, activar la cuenta primero y luego avanzar al siguiente paso
    if (onboardingInfo?.isFirstAdmin) {
      // Activar la cuenta inmediatamente después de configurar la contraseña
      setLoading(true);
      try {
        const response = await fetch('/api/auth/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            password,
            skipKycCheck: true, // KYC no es obligatorio para activar
          }),
        });

        const data = await response.json();

        if (data.success) {
          setPasswordSaved(true);
          setAccountActivated(true);
          saveOnboardingState(3, true); // Guardar que completó paso 2 y va al paso 3 (KYC)
          setCurrentStep(3); // Ir al paso de KYC
        } else {
          setError(data.error || t('error.activationError'));
        }
      } catch {
        setError(t('error.connectionError'));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Si no es primer admin, activar cuenta directamente
    await activateAccount();
  };

  const activateAccount = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          skipKycCheck: !onboardingInfo?.isFirstAdmin, // Solo verificar KYC si es primer admin
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Si es primer admin, el flujo continúa en el paso 4 (completado)
        // Si no es primer admin, redirigir al login: la cuenta de organización
        // (ORG_ADMIN, sin empresa) tiene su propio panel, no el dashboard.
        if (!onboardingInfo?.isFirstAdmin) {
          const loginPath = onboardingInfo?.role === 'ORG_ADMIN' ? '/auth/organization/login' : '/auth/admin/login';
          router.push(`${loginPath}?message=account-activated`);
        }
        // Para primer admin, handleKycVerified maneja la activación y avance al paso 4
      } else {
        setError(data.error || t('error.activationError'));
      }
    } catch {
      setError(t('error.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const [accountActivated, setAccountActivated] = useState(false);
  const kycVerifiedCalledRef = useRef(false); // Prevenir llamadas múltiples

  const handleFinish = useCallback(() => {
    // Limpiar estado guardado antes de redirigir
    clearOnboardingState();
    // Redirigir al dashboard
    router.push('/dashboard');
  }, [router]);

  const activateAccountAndComplete = useCallback(async () => {
    // Prevenir llamadas múltiples
    if (kycVerifiedCalledRef.current && accountActivated) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    if (!token) {
      setLoading(false);
      return;
    }

    // Si la contraseña ya fue guardada, usarla; si no, el usuario ya debería haberla configurado
    if (!password && !passwordSaved) {
      setError(t('password.errors.passwordRequired'));
      setLoading(false);
      // Redirigir al paso de contraseña
      setCurrentStep(2);
      kycVerifiedCalledRef.current = false; // Reset para permitir reintento
      return;
    }

    try {
      const response = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: password || '', // Si password está vacío pero passwordSaved es true, el backend debería manejar esto
          skipKycCheck: true, // KYC ya no es obligatorio para activar
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAccountActivated(true);
        // Guardar estado de completado
        saveOnboardingState(4, true);
        // Avanzar al paso final de confirmación
        setCurrentStep(4);
        // Redirigir automáticamente al dashboard después de 2 segundos
        setTimeout(() => {
          handleFinish();
        }, 2000);
      } else {
        setError(data.error || t('error.activationError'));
        setLoading(false);
        kycVerifiedCalledRef.current = false; // Reset para permitir reintento
      }
    } catch (err) {
      console.error('Error activating account:', err);
      setError(t('error.connectionError'));
      setLoading(false);
      kycVerifiedCalledRef.current = false; // Reset para permitir reintento
    }
  }, [token, password, passwordSaved, accountActivated, handleFinish, t]);

  const handleNext = () => {
    setError('');
    if (currentStep < 4) {
      const nextStep = (currentStep + 1) as OnboardingStep;
      setCurrentStep(nextStep);
      // Guardar estado cuando avanza de paso
      if (onboardingInfo?.isFirstAdmin) {
        saveOnboardingState(nextStep, passwordSaved);
      }
    }
  };

  const handleKycVerifiedAndRedirect = useCallback(async () => {
    console.log('handleKycVerifiedAndRedirect called', { accountActivated, currentStep, passwordSaved });
    
    // Prevenir llamadas múltiples usando ref
    if (kycVerifiedCalledRef.current) {
      console.log('handleKycVerifiedAndRedirect already called, skipping');
      return;
    }
    
    if (currentStep === 4) {
      console.log('Already at step 4, skipping');
      return; // Ya estamos en el paso de completado
    }

    kycVerifiedCalledRef.current = true;

    // La cuenta debería estar activada desde el paso 2, así que solo avanzamos al paso 4
    // Si por alguna razón no está activada pero la contraseña fue guardada, redirigimos directamente
    if (accountActivated || passwordSaved) {
      console.log('Account already activated or password saved, moving to step 4');
      // La cuenta ya está activada o la contraseña fue guardada, solo avanzar al paso de completado
      saveOnboardingState(4, true);
      setCurrentStep(4);
      // Redirigir automáticamente al dashboard después de 2 segundos
      setTimeout(() => {
        console.log('Redirecting to dashboard...');
        handleFinish();
      }, 2000);
    } else {
      console.log('Account not activated and password not saved, redirecting to dashboard anyway');
      // Si por alguna razón no está activada ni guardada, redirigir directamente al dashboard
      // El usuario puede hacer login más tarde si es necesario
      handleFinish();
    }
  }, [accountActivated, currentStep, passwordSaved, handleFinish]);

  const handlePrevious = () => {
    setError('');
    if (currentStep > 1) {
      const prevStep = (currentStep - 1) as OnboardingStep;
      setCurrentStep(prevStep);
      // Guardar estado cuando retrocede de paso
      if (onboardingInfo?.isFirstAdmin) {
        saveOnboardingState(prevStep, passwordSaved);
      }
    }
  };

  // Pantalla de carga inicial
  if (validating) {
    return (
      <ActivationShell>
        <Center py="xl">
          <Stack align="center" gap="sm">
            <Loader />
            <Text fw={500}>{t('validatingToken')}</Text>
          </Stack>
        </Center>
      </ActivationShell>
    );
  }

  if (!tokenValid || !onboardingInfo) {
    return (
      <ActivationShell>
        <Stack align="center" gap="md" ta="center">
          <ThemeIcon size={64} radius="xl" color="red" variant="light">
            <IconCircleX size={36} stroke={1.6} />
          </ThemeIcon>
          <Title order={3}>{t('error.title')}</Title>
          <Alert color="red" variant="light" w="100%">
            {error || t('error.invalidTokenMessage')}
          </Alert>
          <Button fullWidth onClick={() => router.push('/auth/admin/login')}>
            {t('error.goToLogin')}
          </Button>
        </Stack>
      </ActivationShell>
    );
  }

  const passwordFields = (
    <>
      <PasswordInput
        label={t('password.passwordLabel')}
        placeholder={t('password.passwordPlaceholder')}
        description={t('password.passwordHelp')}
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        required
        disabled={loading}
        minLength={8}
        leftSection={<IconLock size={16} />}
      />
      <PasswordInput
        label={t('password.confirmPasswordLabel')}
        placeholder={t('password.confirmPasswordPlaceholder')}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.currentTarget.value)}
        required
        disabled={loading}
        minLength={8}
        leftSection={<IconLock size={16} />}
      />
    </>
  );

  if (onboardingInfo.isFirstAdmin) {
    const progress = (currentStep / 4) * 100;
    const stepName = [t('steps.welcome'), t('steps.password'), t('steps.verification'), t('steps.completed')][currentStep - 1];

    return (
      <ActivationShell wide={isKycEmbedded}>
        <Stack gap="lg">
          <div>
            <Group justify="space-between" mb={6}>
              <Text size="sm" c="dimmed" fw={500}>{t('steps.step', { current: currentStep })}</Text>
              <Text size="sm" c="datiaBlue" fw={600}>{stepName}</Text>
            </Group>
            <Progress value={progress} size="sm" radius="xl" color="datiaBlue" />
          </div>

          {error && (
            <Alert color="red" variant="light" withCloseButton onClose={() => setError('')} icon={<IconCircleX size={16} />}>
              {error}
            </Alert>
          )}

          {currentStep === 1 && (
            <WelcomeStep
              userName={onboardingInfo.userName}
              organizationName={onboardingInfo.organizationName}
              onNext={handleNext}
            />
          )}

          {currentStep === 2 && (
            <Stack align="center" gap="sm" ta="center">
              <ThemeIcon size={64} radius="xl" color="datiaBlue" variant="light">
                <IconLock size={30} stroke={1.6} />
              </ThemeIcon>
              <Title order={3}>{t('password.title')}</Title>
              <Text c="dimmed">{t('password.subtitle')}</Text>
              {passwordSaved && (
                <Alert color="datiaBlue" variant="light" w="100%" icon={<IconInfoCircle size={16} />}>
                  {t('password.alreadySet')}
                </Alert>
              )}
              <form onSubmit={handlePasswordSubmit} style={{ width: '100%' }}>
                <Stack gap="md" ta="left">
                  {passwordFields}
                  <Group grow>
                    <Button variant="default" onClick={handlePrevious} disabled={loading} leftSection={<IconArrowLeft size={16} />}>
                      {tCommon('previous')}
                    </Button>
                    <Button type="submit" loading={loading} rightSection={!loading ? <IconArrowRight size={16} /> : undefined}>
                      {loading ? t('password.saving') : t('password.continue')}
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Stack>
          )}

          {currentStep === 3 && (
            <KycStep
              companyId={onboardingInfo.companyId!}
              activationToken={token!}
              kycURL={onboardingInfo.kycURL}
              initialStatus={onboardingInfo.verificationStatus}
              onVerified={handleKycVerifiedAndRedirect}
              onGoToLogin={() => {
                clearOnboardingState();
                router.push('/auth/admin/login?message=kyc-completed');
              }}
              onPrevious={handlePrevious}
              onEmbeddedChange={setIsKycEmbedded}
            />
          )}

          {currentStep === 4 && accountActivated && (
            <Stack align="center" gap="sm" ta="center">
              <ThemeIcon size={72} radius="xl" color="green" variant="light">
                <IconCircleCheck size={40} stroke={1.6} />
              </ThemeIcon>
              <Title order={3}>{t('completed.title')}</Title>
              <Text size="sm" c="dimmed">{t('completed.redirecting')}</Text>
            </Stack>
          )}
        </Stack>
      </ActivationShell>
    );
  }

  return (
    <ActivationShell>
      <Stack gap="lg">
        <Stack align="center" gap="sm" ta="center">
          <ThemeIcon size={64} radius="xl" color="datiaBlue" variant="light">
            <IconUserCheck size={32} stroke={1.6} />
          </ThemeIcon>
          <Title order={3}>{t('account.title')}</Title>
          <Text c="dimmed">{t('account.subtitle')}</Text>
        </Stack>

        {error && (
          <Alert color="red" variant="light" withCloseButton onClose={() => setError('')} icon={<IconCircleX size={16} />}>
            {error}
          </Alert>
        )}

        <Alert color="datiaBlue" variant="light" icon={<IconInfoCircle size={16} />}>
          {t('account.pendingActivation')}
        </Alert>

        <form onSubmit={handlePasswordSubmit}>
          <Stack gap="md">
            {passwordFields}
            <Button type="submit" fullWidth size="md" loading={loading} leftSection={!loading ? <IconCheck size={16} /> : undefined}>
              {loading ? t('account.activating') : t('account.activate')}
            </Button>
          </Stack>
        </form>

        <Divider />

        <Text size="sm" c="dimmed" ta="center">
          {t('account.alreadyHaveAccount')}{' '}
          <Anchor href="/auth/admin/login" size="sm">{t('account.login')}</Anchor>
        </Text>
      </Stack>
    </ActivationShell>
  );
}

function ActivationShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <Center mih="100vh" bg="var(--mantine-color-gray-0)" p="md">
      <Paper withBorder radius="lg" shadow="sm" w="100%" maw={wide ? 1400 : 560} style={{ overflow: 'hidden' }}>
        <Center py="xl" bg="white" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
          <Logo href={null} width={200} height={56} priority src="/logo-datia.svg" alt="Datia" />
        </Center>
        <Box p="xl">{children}</Box>
      </Paper>
    </Center>
  );
}

export default function ActivateAccountPage() {
  return (
    <Suspense
      fallback={
        <Center mih="100vh">
          <Loader />
        </Center>
      }
    >
      <ActivateAccountForm />
    </Suspense>
  );
}
