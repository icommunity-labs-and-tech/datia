'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Anchor, Badge, Button, Group, Paper, Stack, Text, ThemeIcon, Title, Center } from '@mantine/core';
import { IconAlertTriangle, IconArrowLeft, IconArrowRight, IconCheck, IconCircleX, IconGauge, IconRefresh, IconShieldCheck } from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';
import { checkKycStatus } from '@/actions/kyc/status';

interface KycStepProps {
  companyId: string;
  activationToken: string;
  kycURL: string | null;
  initialStatus: 'NOT_VERIFIED' | 'WAITING' | 'VERIFIED' | 'REJECTED';
  onVerified: () => void;
  onGoToLogin?: () => void;
  onPrevious?: () => void;
  onEmbeddedChange?: (isEmbedded: boolean) => void;
}

export default function KycStep({
  companyId,
  activationToken,
  kycURL,
  initialStatus,
  onVerified,
  onGoToLogin,
  onPrevious,
  onEmbeddedChange,
}: KycStepProps) {
  const locale = useLocale();
  const t = useTranslations('onboardingKyc');
  const [verificationStatus, setVerificationStatus] = useState<
    'NOT_VERIFIED' | 'WAITING' | 'VERIFIED' | 'REJECTED'
  >(initialStatus);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmbedded, setShowEmbedded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusRef = useRef<'NOT_VERIFIED' | 'WAITING' | 'VERIFIED' | 'REJECTED'>(initialStatus);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const verifiedCalledRef = useRef(false); // Prevenir llamadas múltiples a onVerified
  const retryCheckRef = useRef<NodeJS.Timeout | null>(null); // Para el retry de verificación

  // Función para configurar el iframe (responsive + idioma)
  const configureIframe = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      // Forzar layout responsive
      iframeRef.current.contentWindow.postMessage(
        { type: 'FORCE_RESPONSIVE' },
        '*'
      );
      // Establecer idioma
      iframeRef.current.contentWindow.postMessage(
        { type: 'SET_LANGUAGE', language: locale },
        '*'
      );
    }
  }, [locale]);

  // Función para verificar el estado del KYC (usando useCallback para estabilidad)
  const checkStatus = useCallback(async () => {
    try {
      const result = await checkKycStatus();
      if (result.success && result.verificationStatus) {
        const previousStatus = previousStatusRef.current;
        const newStatus = result.verificationStatus;
        
        setVerificationStatus(newStatus);
        previousStatusRef.current = newStatus;
        
        if (newStatus === 'VERIFIED') {
          setIsPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          // Si el estado cambió a VERIFIED y el iframe está embebido, activar cuenta y redirigir automáticamente
          // Solo llamar una vez usando la ref para evitar loops
          if (previousStatus !== 'VERIFIED' && showEmbedded && !verifiedCalledRef.current) {
            verifiedCalledRef.current = true;
            console.log('KYC status changed to VERIFIED, calling onVerified()');
            // Pequeño delay para que el usuario vea el cambio de estado
            setTimeout(() => {
              onVerified();
            }, 1000);
          }
        } else if (newStatus === 'REJECTED') {
          setIsPolling(false);
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
  }, [companyId, showEmbedded, onVerified, t]);

  // Verificar estado inicial al montar
  useEffect(() => {
    checkStatus();
    previousStatusRef.current = initialStatus;
  }, [checkStatus, initialStatus]);

  // Escuchar mensajes postMessage del iframe (si la página externa los envía)
  useEffect(() => {
    if (!showEmbedded) return;

    const handleMessage = (event: MessageEvent) => {
      // Verificar origen por seguridad (ajustar según el dominio de iCommunity)
      // Por ahora aceptamos mensajes de cualquier origen, pero en producción deberías validar
      console.log('Message received from iframe:', event.data, event.origin);
      
      if (event.data) {
        // Diferentes formatos de mensajes que la página externa podría enviar
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Si la página externa envía un mensaje cuando se completa el KYC
        if (
          data.type === 'kyc-completed' || 
          data.type === 'IDENTITY_PROCESS_COMPLETED' ||
          data.kycCompleted ||
          data.status === 'completed' ||
          data.status === 'success' ||
          data.status === 'verified' ||
          data.verificationStatus === 'VERIFIED' ||
          (typeof data === 'string' && data.includes('completed'))
        ) {
          // El webhook puede tardar hasta un día, así que no verificamos el estado en la BD
          // Redirigimos directamente al dashboard cuando recibimos el postMessage
          console.log('KYC completion detected via postMessage, redirecting to dashboard...', data);
          
          // Actualizar el estado local a VERIFIED para reflejar que el proceso se completó
          setVerificationStatus('VERIFIED');
          previousStatusRef.current = 'VERIFIED';
          
          // Detener el polling si está activo
          setIsPolling(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          // Limpiar cualquier retry anterior
          if (retryCheckRef.current) {
            clearTimeout(retryCheckRef.current);
            retryCheckRef.current = null;
          }
          
          // Llamar a onVerified inmediatamente para avanzar al dashboard
          if (!verifiedCalledRef.current) {
            verifiedCalledRef.current = true;
            // Pequeño delay para que el usuario vea el cambio de estado
            setTimeout(() => {
              onVerified();
            }, 500);
          }
        }
        
        // También escuchar mensajes de error
        if (
          data.type === 'error' ||
          data.error ||
          data.status === 'error' ||
          (typeof data === 'string' && (data.includes('error') || data.includes('bloqueada')))
        ) {
          console.log('Error detected via postMessage');
          setIframeError(true);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      // Limpiar retry al desmontar
      if (retryCheckRef.current) {
        clearTimeout(retryCheckRef.current);
        retryCheckRef.current = null;
      }
    };
  }, [showEmbedded, checkStatus]);

  // Verificar estado cuando la página vuelve a estar visible (el usuario regresa después del KYC)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && verificationStatus === 'WAITING') {
        // Verificar inmediatamente cuando el usuario vuelve a la página
        checkStatus();
      }
    };

    const handleFocus = () => {
      if (verificationStatus === 'WAITING') {
        checkStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [verificationStatus, checkStatus]);

  // Iniciar/detener polling cuando el estado cambia a WAITING
  // El polling es un fallback, el webhook debería actualizar el estado primero
  useEffect(() => {
    // Limpiar intervalo anterior si existe
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Si el estado es WAITING, iniciar polling como fallback
    // El webhook debería actualizar el estado primero, pero el polling asegura
    // que detectemos cambios incluso si el webhook falla o hay retrasos
    if (verificationStatus === 'WAITING') {
      setIsPolling(true);
      // Polling muy frecuente cuando el iframe está embebido (2 segundos) para detectar cambios rápidamente
      // Polling menos frecuente cuando no está embebido (15 segundos) ya que confiamos en el webhook
      const pollingInterval = showEmbedded ? 2000 : 15000;
      pollingIntervalRef.current = setInterval(() => {
        checkStatus();
      }, pollingInterval);
    } else {
      setIsPolling(false);
    }

    // Cleanup al desmontar o cuando cambia el estado
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [verificationStatus, checkStatus, showEmbedded]);

  const handleOpenKyc = () => {
    if (kycURL) {
      // Mostrar iframe embebido (responsive gracias a FORCE_RESPONSIVE postMessage)
      setShowEmbedded(true);
      onEmbeddedChange?.(true);
      // Si estaba en NOT_VERIFIED, cambiar a WAITING y empezar polling
      if (verificationStatus === 'NOT_VERIFIED') {
        const newStatus = 'WAITING';
        setVerificationStatus(newStatus);
        previousStatusRef.current = newStatus;
      }
    } else {
      console.error('kycURL is null or undefined');
    }
  };

  const handleCloseEmbedded = () => {
    setShowEmbedded(false);
    onEmbeddedChange?.(false);
    // Limpiar el iframe para evitar que persista el estado
    if (iframeRef.current && kycURL) {
      // Cambiar el src a about:blank para limpiar completamente el iframe
      iframeRef.current.src = 'about:blank';
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
      {!showEmbedded && (
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

      {verificationStatus === 'NOT_VERIFIED' && !showEmbedded && (
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

      {verificationStatus === 'WAITING' && !showEmbedded && (
        <Stack gap="sm">
          <Button variant="light" onClick={handleOpenKyc} fullWidth leftSection={<IconShieldCheck size={18} />}>
            {t('start')}
          </Button>
          {onPrevious && (
            <Button variant="default" onClick={onPrevious} fullWidth leftSection={<IconArrowLeft size={16} />}>
              {t('previous')}
            </Button>
          )}
        </Stack>
      )}

      {showEmbedded && kycURL && (
        <div style={{ position: 'relative', minHeight: 600 }}>
          {iframeError ? (
            <Paper
              withBorder
              radius="md"
              p="xl"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.95)',
              }}
            >
              <Stack align="center" gap="md" maw={480} ta="center">
                <ThemeIcon size={72} radius="xl" color="yellow" variant="light">
                  <IconAlertTriangle size={36} stroke={1.6} />
                </ThemeIcon>
                <Title order={4}>{t('iframeError.title')}</Title>
                <Text size="sm" c="dimmed">{t('iframeError.body')}</Text>
                <Stack gap="xs" w="100%">
                  <Button
                    fullWidth
                    style={primaryButtonStyle}
                    leftSection={<IconGauge size={16} />}
                    onClick={async () => {
                      // Verificar el estado antes de redirigir
                      const result = await checkKycStatus();
                      // Si está verificado, activar cuenta y redirigir
                      // Si no, redirigir directamente al dashboard (el usuario ya tiene contraseña configurada)
                      if (result.success && result.verificationStatus === 'VERIFIED') {
                        // Actualizar el estado local
                        setVerificationStatus('VERIFIED');
                        // Activar cuenta y redirigir
                        onVerified();
                      } else {
                        // Cerrar el iframe y redirigir directamente al dashboard
                        handleCloseEmbedded();
                        // Pequeño delay para que se cierre el iframe
                        setTimeout(() => {
                          window.location.href = '/dashboard';
                        }, 300);
                      }
                    }}
                  >
                    {t('iframeError.goDashboard')}
                  </Button>
                  <Button
                    variant="default"
                    fullWidth
                    style={primaryButtonStyle}
                    leftSection={<IconRefresh size={16} />}
                    onClick={() => {
                      setIframeError(false);
                      // Recargar el iframe
                      if (iframeRef.current && kycURL) {
                        iframeRef.current.src = kycURL;
                      }
                    }}
                  >
                    {t('iframeError.retry')}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ) : (
            <div
              style={{
                width: '100%',
                overflow: 'hidden',
                borderRadius: 'var(--mantine-radius-md)',
                border: '1px solid var(--mantine-color-gray-2)',
                background: 'var(--mantine-color-gray-0)',
              }}
            >
              <iframe
                ref={iframeRef}
                src={kycURL}
                key={showEmbedded ? kycURL : undefined}
                style={{ width: '100%', height: 600, border: 'none' }}
                title={t('iframeTitle')}
                allow="camera; microphone"
                onError={() => {
                  setIframeError(true);
                }}
                onLoad={(e) => {
                  // Configurar iframe (responsive + idioma)
                  configureIframe();

                  // Detectar errores comunes en el iframe
                  try {
                    const iframe = e.target as HTMLIFrameElement;
                    // Verificar periódicamente el contenido del iframe para detectar errores
                    const checkForErrors = () => {
                      try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                        if (iframeDoc) {
                          const bodyText = iframeDoc.body?.innerText || '';
                          const bodyHTML = iframeDoc.body?.innerHTML || '';
                          // Detectar el error específico de conexión bloqueada
                          if (
                            bodyText.includes('bloqueada') ||
                            bodyText.includes('bloqueado') ||
                            bodyText.includes('conexión está bloqueada') ||
                            bodyText.includes('connection is blocked') ||
                            bodyText.includes('página pública') ||
                            bodyText.includes('public page') ||
                            bodyHTML.includes('ERR_BLOCKED_BY_CLIENT') ||
                            bodyHTML.includes('net::ERR')
                          ) {
                            setIframeError(true);
                            return true; // Error detectado
                          }
                        }
                      } catch (err) {
                        // CORS puede bloquear el acceso, pero eso es normal
                      }
                      return false;
                    };

                    // Verificar inmediatamente y luego periódicamente
                    setTimeout(() => {
                      if (!checkForErrors()) {
                        // Si no hay error inicial, verificar periódicamente
                        const errorCheckInterval = setInterval(() => {
                          if (checkForErrors()) {
                            clearInterval(errorCheckInterval);
                          }
                        }, 2000);

                        // Limpiar después de 30 segundos (suficiente tiempo para detectar errores)
                        setTimeout(() => clearInterval(errorCheckInterval), 30000);
                      }
                    }, 2000);
                  } catch (err) {
                    console.error('Error accessing iframe:', err);
                  }
                }}
              />
            </div>
          )}
        </div>
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
