'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useLocale } from 'next-intl';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { checkKycStatus } from '@/actions/organizations/check-kyc-status';

interface KycStepProps {
  organizationId: string;
  activationToken: string;
  kycURL: string | null;
  initialStatus: 'NOT_VERIFIED' | 'WAITING' | 'VERIFIED' | 'REJECTED';
  onVerified: () => void;
  onGoToLogin?: () => void;
  onPrevious?: () => void;
  onEmbeddedChange?: (isEmbedded: boolean) => void;
}

export default function KycStep({
  organizationId,
  activationToken,
  kycURL,
  initialStatus,
  onVerified,
  onGoToLogin,
  onPrevious,
  onEmbeddedChange,
}: KycStepProps) {
  const locale = useLocale();
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
      const result = await checkKycStatus(organizationId);
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
          setError('La verificación fue rechazada. Por favor, contacta con soporte.');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }
    } catch (err) {
      console.error('Error checking KYC status:', err);
    }
  }, [organizationId, showEmbedded, onVerified]);

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
      <Alert variant="warning">
        <Alert.Heading>
          <i className="bi bi-exclamation-triangle me-2"></i>
          URL de verificación no disponible
        </Alert.Heading>
        <p>
          No se pudo generar la URL de verificación. Por favor, contacta con soporte para completar el proceso de verificación.
        </p>
      </Alert>
    );
  }

  return (
    <div>
      {!showEmbedded && (
        <>
          <div className="text-center mb-4">
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <i className="bi bi-shield-check text-white" style={{ fontSize: '2.5rem' }}></i>
            </div>
            <h3 className="mb-2" style={{ color: '#1a1a1a', fontWeight: 600 }}>Verificación de Identidad</h3>
          </div>

          {error && (
            <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)} style={{ borderRadius: '8px' }}>
              {error}
            </Alert>
          )}
        </>
      )}

      {showEmbedded && error && (
        <Alert variant="danger" className="mb-3" dismissible onClose={() => setError(null)} style={{ borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {verificationStatus === 'NOT_VERIFIED' && !showEmbedded && (
        <div>
          <div className="text-center mb-3">
            <Button
              onClick={handleOpenKyc}
              className="w-100"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                padding: '14px',
                boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'
              }}
            >
              <i className="bi bi-shield-check me-2"></i>
              Empezar
            </Button>
            <p className="text-muted small mt-3 mb-0">
              Completa el proceso de verificación a continuación
            </p>
          </div>
          {onPrevious && (
            <Button
              variant="outline-secondary"
              onClick={onPrevious}
              className="w-100"
              style={{ borderRadius: '8px', fontWeight: 500 }}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Anterior
            </Button>
          )}
        </div>
      )}

      {verificationStatus === 'WAITING' && !showEmbedded && (
        <div>
          <div className="text-center mb-3">
            <Button
              onClick={handleOpenKyc}
              variant="outline-primary"
              className="w-100"
              style={{ borderRadius: '8px', fontWeight: 500 }}
            >
              <i className="bi bi-shield-check me-2"></i>
              Empezar
            </Button>
          </div>
          {onPrevious && (
            <Button
              variant="outline-secondary"
              onClick={onPrevious}
              className="w-100"
              style={{ borderRadius: '8px', fontWeight: 500 }}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Anterior
            </Button>
          )}
        </div>
      )}

      {showEmbedded && kycURL && (
        <div style={{ margin: '0 -1rem', position: 'relative', minHeight: '600px', zIndex: 1 }}>
          {iframeError ? (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '2rem',
              borderRadius: '8px'
            }}>
              <div className="text-center" style={{ maxWidth: '500px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 1.5rem',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="bi bi-exclamation-triangle text-white" style={{ fontSize: '2.5rem' }}></i>
                </div>
                <h4 className="mb-3" style={{ color: '#1a1a1a', fontWeight: 600 }}>
                  Error al cargar el proceso de verificación
                </h4>
                <p className="mb-4" style={{ color: '#666' }}>
                  Hubo un problema al cargar la página de verificación. Si ya completaste el proceso de verificación, puedes continuar al dashboard.
                </p>
                <div className="d-flex flex-column gap-2">
                  <Button
                    variant="primary"
                    onClick={async () => {
                      // Verificar el estado antes de redirigir
                      const result = await checkKycStatus(organizationId);
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
                    className="w-100"
                    size="lg"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      padding: '14px'
                    }}
                  >
                    <i className="bi bi-speedometer2 me-2"></i>
                    Ir al Dashboard
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      setIframeError(false);
                      // Recargar el iframe
                      if (iframeRef.current && kycURL) {
                        iframeRef.current.src = kycURL;
                      }
                    }}
                    className="w-100"
                    size="lg"
                    style={{ borderRadius: '8px', padding: '14px' }}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Reintentar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              background: '#f8f9fa',
            }}>
              <iframe
                ref={iframeRef}
                src={kycURL}
                key={showEmbedded ? kycURL : undefined}
                style={{
                  width: '100%',
                  height: '600px',
                  border: 'none'
                }}
                title="Proceso de verificación KYC"
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
        <div>
          <div className="text-center mb-3">
            <div className="mb-3">
              <span className="badge bg-success" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
                <i className="bi bi-check-circle me-1"></i>
                Verificado
              </span>
            </div>
            <Button
              onClick={handleContinue}
              className="w-100"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                padding: '14px',
                boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)'
              }}
            >
              Continuar
              <i className="bi bi-arrow-right ms-2"></i>
            </Button>
          </div>
          {onPrevious && (
            <Button
              variant="outline-secondary"
              onClick={onPrevious}
              className="w-100"
              style={{ borderRadius: '8px', fontWeight: 500 }}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Anterior
            </Button>
          )}
        </div>
      )}

      {verificationStatus === 'REJECTED' && (
        <Alert variant="danger" style={{ borderRadius: '8px' }}>
          <Alert.Heading className="h6">
            <i className="bi bi-x-circle me-2"></i>
            Verificación rechazada
          </Alert.Heading>
          <p className="mb-0 small">
            Por favor, contacta con soporte para más información.
          </p>
        </Alert>
      )}
    </div>
  );
}
