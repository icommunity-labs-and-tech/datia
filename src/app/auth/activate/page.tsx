'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Button, Alert, Card, Container, Spinner, ProgressBar } from 'react-bootstrap';
import Image from 'next/image';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { getOnboardingInfo } from '@/actions/organizations/get-onboarding-info';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import TutorialStep from '@/components/onboarding/TutorialStep';
import KycStep from '@/components/onboarding/KycStep';
import { useTranslations } from 'next-intl';

// Estilos para el fondo animado
const backgroundStyles = `
  @keyframes gradientShift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-20px);
    }
  }
  
  @keyframes lightMove {
    0% {
      stroke-dashoffset: 0;
      opacity: 0.3;
    }
    10% {
      opacity: 1;
    }
    50% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      stroke-dashoffset: -1000;
      opacity: 0.3;
    }
  }
  
  @keyframes lightPulse {
    0%, 100% {
      opacity: 0.4;
      filter: blur(2px);
    }
    50% {
      opacity: 1;
      filter: blur(4px);
    }
  }
`;

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

function ActivateAccountForm() {
  const t = useTranslations('auth.activate');
  const tCommon = useTranslations('common.actions');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Estados para información de onboarding
  const [onboardingInfo, setOnboardingInfo] = useState<{
    isFirstAdmin: boolean;
    userName: string;
    organizationName: string;
    organizationId: string;
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
          // Si ya está activado, limpiar estado guardado y redirigir
          clearOnboardingState();
          router.push('/auth/admin/login?message=account-activated');
          return;
        }

        setTokenValid(true);
        setOnboardingInfo({
          isFirstAdmin: info.isFirstAdmin,
          userName: info.userName,
          organizationName: info.organizationName,
          organizationId: info.organizationId,
          kycURL: info.kycURL,
          verificationStatus: info.verificationStatus,
        });

        // Si es primer admin, restaurar estado guardado
        if (info.isFirstAdmin) {
          const savedState = loadOnboardingState();
          if (savedState) {
            // Determinar el paso correcto basado en el estado guardado y el estado real
            let restoredStep: OnboardingStep = savedState.step;
            
            // Si el KYC ya está verificado, ir al paso 5 (completado)
            if (info.verificationStatus === 'VERIFIED') {
              restoredStep = 5;
              setAccountActivated(true);
            }
            // Si guardó la contraseña pero no completó KYC, ir al paso 4 (KYC)
            else if (savedState.passwordSet && restoredStep < 4) {
              restoredStep = 4;
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
          saveOnboardingState(3, true); // Guardar que completó paso 2 y va al paso 3 (tour)
          setCurrentStep(3); // Ir al paso del tour
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
        // Si no es primer admin, redirigir al login
        if (!onboardingInfo?.isFirstAdmin) {
          router.push('/auth/admin/login?message=account-activated');
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
        saveOnboardingState(5, true);
        // Avanzar al paso final de confirmación
        setCurrentStep(5);
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
    if (currentStep < 5) {
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
    
    if (currentStep === 5) {
      console.log('Already at step 5, skipping');
      return; // Ya estamos en el paso de completado
    }
    
    kycVerifiedCalledRef.current = true;
    
    // La cuenta debería estar activada desde el paso 2, así que solo avanzamos al paso 5
    // Si por alguna razón no está activada pero la contraseña fue guardada, redirigimos directamente
    if (accountActivated || passwordSaved) {
      console.log('Account already activated or password saved, moving to step 5');
      // La cuenta ya está activada o la contraseña fue guardada, solo avanzar al paso de completado
      saveOnboardingState(5, true);
      setCurrentStep(5);
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
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradientShift 15s ease infinite',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Mapa barroco con bloques de colores */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.25,
            pointerEvents: 'none'
          }}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="block1c" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.5)" />
              <stop offset="100%" stopColor="rgba(99, 102, 241, 0.4)" />
            </linearGradient>
            <linearGradient id="block2c" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(236, 72, 153, 0.5)" />
              <stop offset="100%" stopColor="rgba(219, 39, 119, 0.4)" />
            </linearGradient>
            <linearGradient id="block3c" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.5)" />
              <stop offset="100%" stopColor="rgba(124, 58, 237, 0.4)" />
            </linearGradient>
          </defs>
          
          <path d="M 0,0 L 450,0 L 550,180 L 400,380 L 250,330 L 150,180 Z" fill="url(#block1c)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
          <path d="M 450,0 L 900,0 L 1000,140 L 900,280 L 700,330 L 550,180 Z" fill="url(#block2c)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
          <path d="M 900,0 L 1200,0 L 1200,220 L 1100,380 L 900,330 L 1000,140 Z" fill="url(#block3c)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
          <path d="M 0,380 L 400,380 L 550,180 L 700,330 L 650,530 L 450,580 L 250,530 L 150,430 Z" fill="url(#block1c)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
          <path d="M 700,330 L 900,280 L 1100,380 L 1200,220 L 1200,580 L 1000,680 L 700,630 L 650,530 Z" fill="url(#block2c)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
        </svg>
        
        {/* Estilos de animación */}
        <style dangerouslySetInnerHTML={{ __html: backgroundStyles }} />
        <div className="text-center" style={{ color: 'white' }}>
          <Spinner animation="border" variant="light" style={{ borderWidth: '3px' }} />
          <p className="mt-3" style={{ fontSize: '1.1rem', fontWeight: 500 }}>{t('validatingToken')}</p>
        </div>
      </div>
    );
  }

  // Pantalla de error
  if (!tokenValid || !onboardingInfo) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradientShift 15s ease infinite',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        {/* Mapa barroco con bloques de colores */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.25,
            pointerEvents: 'none'
          }}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="block1b" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.5)" />
              <stop offset="100%" stopColor="rgba(99, 102, 241, 0.4)" />
            </linearGradient>
            <linearGradient id="block2b" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(236, 72, 153, 0.5)" />
              <stop offset="100%" stopColor="rgba(219, 39, 119, 0.4)" />
            </linearGradient>
            <linearGradient id="block3b" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.5)" />
              <stop offset="100%" stopColor="rgba(124, 58, 237, 0.4)" />
            </linearGradient>
            <linearGradient id="block4b" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(168, 85, 247, 0.5)" />
              <stop offset="100%" stopColor="rgba(147, 51, 234, 0.4)" />
            </linearGradient>
          </defs>
          
          <path d="M 0,0 L 400,0 L 500,200 L 350,400 L 200,350 L 100,200 Z" fill="url(#block1b)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
          <path d="M 400,0 L 800,0 L 900,150 L 800,300 L 600,350 L 500,200 Z" fill="url(#block2b)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
          <path d="M 800,0 L 1200,0 L 1200,250 L 1100,400 L 900,350 L 900,150 Z" fill="url(#block3b)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
          <path d="M 0,400 L 350,400 L 500,200 L 600,350 L 550,550 L 400,600 L 200,550 L 100,450 Z" fill="url(#block4b)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
          <path d="M 600,350 L 800,300 L 1100,400 L 1200,250 L 1200,600 L 1000,700 L 700,650 L 550,550 Z" fill="url(#block1b)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
          <path d="M 0,450 L 100,450 L 200,550 L 400,600 L 300,800 L 0,800 Z" fill="url(#block2b)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
          <path d="M 400,600 L 700,650 L 1000,700 L 900,800 L 500,800 L 300,800 Z" fill="url(#block3b)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="2" />
        </svg>
        
        {/* Estilos de animación */}
        <style dangerouslySetInnerHTML={{ __html: backgroundStyles }} />
        <Card style={{ width: '100%', maxWidth: '500px' }} className="shadow-lg border-0">
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '2rem',
            textAlign: 'center',
            borderRadius: '0.375rem 0.375rem 0 0'
          }}>
            <Image 
              src="/logo.webp" 
              alt="Datia" 
              width={180} 
              height={60} 
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <Card.Body className="p-4">
            <div className="text-center mb-4">
              <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: '3rem' }}></i>
              <h3 className="mt-3 mb-2" style={{ color: '#1a1a1a', fontWeight: 600 }}>{t('error.title')}</h3>
            </div>
            <Alert variant="danger" className="border-0" style={{ borderRadius: '8px' }}>
              {error || t('error.invalidTokenMessage')}
            </Alert>
            <Button 
              variant="primary" 
              className="w-100" 
              onClick={() => router.push('/auth/admin/login')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                fontWeight: 600
              }}
            >
              {t('error.goToLogin')}
            </Button>
          </Card.Body>
        </Card>
      </div>
    );
  }

  // Si es primer admin, mostrar wizard multi-paso
  if (onboardingInfo.isFirstAdmin) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradientShift 15s ease infinite',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isKycEmbedded ? '1rem' : '2rem'
      }}>
        {/* Mapa barroco con bloques de colores */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.25,
            pointerEvents: 'none'
          }}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="block1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.5)" />
              <stop offset="100%" stopColor="rgba(99, 102, 241, 0.4)" />
            </linearGradient>
            <linearGradient id="block2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(236, 72, 153, 0.5)" />
              <stop offset="100%" stopColor="rgba(219, 39, 119, 0.4)" />
            </linearGradient>
            <linearGradient id="block3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.5)" />
              <stop offset="100%" stopColor="rgba(124, 58, 237, 0.4)" />
            </linearGradient>
            <linearGradient id="block4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(168, 85, 247, 0.5)" />
              <stop offset="100%" stopColor="rgba(147, 51, 234, 0.4)" />
            </linearGradient>
            <linearGradient id="block5" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(79, 70, 229, 0.5)" />
              <stop offset="100%" stopColor="rgba(67, 56, 202, 0.4)" />
            </linearGradient>
            
            {/* Gradientes para la luz que recorre las líneas */}
            <linearGradient id="lightGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
              <stop offset="50%" stopColor="rgba(255, 255, 255, 0.8)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
            <linearGradient id="lightGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
              <stop offset="50%" stopColor="rgba(240, 147, 251, 0.9)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
            <linearGradient id="lightGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
              <stop offset="50%" stopColor="rgba(102, 126, 234, 0.9)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
          </defs>
          
          {/* Bloques tipo mapa - Regiones irregulares */}
          <path
            d="M 0,0 L 350,0 L 420,180 L 280,320 L 150,280 L 80,150 Z"
            fill="url(#block1)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="2"
          />
          
          <path
            d="M 350,0 L 700,0 L 750,120 L 680,250 L 520,300 L 420,180 Z"
            fill="url(#block2)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="2"
          />
          
          <path
            d="M 700,0 L 1200,0 L 1200,200 L 1100,350 L 900,380 L 750,120 Z"
            fill="url(#block3)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="2"
          />
          
          <path
            d="M 0,320 L 280,320 L 420,180 L 520,300 L 480,450 L 300,500 L 150,450 L 80,380 Z"
            fill="url(#block4)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="2"
          />
          
          <path
            d="M 520,300 L 680,250 L 900,380 L 1100,350 L 1150,500 L 1000,600 L 800,650 L 600,600 L 480,450 Z"
            fill="url(#block5)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="2"
          />
          
          <path
            d="M 1200,200 L 1200,500 L 1150,500 L 1100,350 Z"
            fill="url(#block1)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="2"
          />
          
          <path
            d="M 0,380 L 80,380 L 150,450 L 300,500 L 250,650 L 100,700 L 0,600 Z"
            fill="url(#block2)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="2"
          />
          
          <path
            d="M 300,500 L 600,600 L 800,650 L 750,800 L 500,800 L 250,650 Z"
            fill="url(#block3)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="2"
          />
          
          <path
            d="M 800,650 L 1000,600 L 1200,500 L 1200,800 L 1000,800 L 750,800 Z"
            fill="url(#block4)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="2"
          />
          
          {/* Gradiente para la luz que recorre las líneas */}
          <defs>
            <linearGradient id="lightGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
              <stop offset="50%" stopColor="rgba(255, 255, 255, 0.8)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
            <linearGradient id="lightGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
              <stop offset="50%" stopColor="rgba(240, 147, 251, 0.9)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
            <linearGradient id="lightGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
              <stop offset="50%" stopColor="rgba(102, 126, 234, 0.9)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
          </defs>
          
          {/* Líneas de frontera con luz animada */}
          <path
            d="M 0,0 L 350,0 L 420,180 L 280,320 L 150,280 L 80,150 Z"
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="1.5"
          />
          <path
            d="M 0,0 L 350,0 L 420,180 L 280,320 L 150,280 L 80,150 Z"
            fill="none"
            stroke="url(#lightGradient1)"
            strokeWidth="4"
            strokeDasharray="30 300"
            strokeDashoffset="0"
            style={{
              animation: 'lightMove 8s linear infinite',
              filter: 'blur(4px)',
              opacity: 0.9
            }}
          />
          
          <path
            d="M 350,0 L 700,0 L 750,120 L 680,250 L 520,300 L 420,180 Z"
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="1.5"
          />
          <path
            d="M 350,0 L 700,0 L 750,120 L 680,250 L 520,300 L 420,180 Z"
            fill="none"
            stroke="url(#lightGradient2)"
            strokeWidth="3"
            strokeDasharray="20 200"
            style={{
              animation: 'lightMove 10s linear infinite',
              filter: 'blur(3px)',
              opacity: 0.8,
              animationDelay: '2s'
            }}
          />
          
          <path
            d="M 700,0 L 1200,0 L 1200,200 L 1100,350 L 900,380 L 750,120 Z"
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="1.5"
          />
          <path
            d="M 700,0 L 1200,0 L 1200,200 L 1100,350 L 900,380 L 750,120 Z"
            fill="none"
            stroke="url(#lightGradient3)"
            strokeWidth="3"
            strokeDasharray="20 200"
            style={{
              animation: 'lightMove 9s linear infinite',
              filter: 'blur(3px)',
              opacity: 0.8,
              animationDelay: '4s'
            }}
          />
          
          {/* Más líneas con luz animada */}
          <path
            d="M 0,320 L 280,320 L 420,180 L 520,300 L 480,450 L 300,500 L 150,450 L 80,380 Z"
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="1.5"
          />
          <path
            d="M 0,320 L 280,320 L 420,180 L 520,300 L 480,450 L 300,500 L 150,450 L 80,380 Z"
            fill="none"
            stroke="url(#lightGradient1)"
            strokeWidth="4"
            strokeDasharray="30 300"
            strokeDashoffset="0"
            style={{
              animation: 'lightMove 12s linear infinite',
              filter: 'blur(4px)',
              opacity: 0.9,
              animationDelay: '1s'
            }}
          />
          
          <path
            d="M 520,300 L 680,250 L 900,380 L 1100,350 L 1150,500 L 1000,600 L 800,650 L 600,600 L 480,450 Z"
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="1.5"
          />
          <path
            d="M 520,300 L 680,250 L 900,380 L 1100,350 L 1150,500 L 1000,600 L 800,650 L 600,600 L 480,450 Z"
            fill="none"
            stroke="url(#lightGradient2)"
            strokeWidth="4"
            strokeDasharray="30 300"
            strokeDashoffset="0"
            style={{
              animation: 'lightMove 11s linear infinite',
              filter: 'blur(4px)',
              opacity: 0.9,
              animationDelay: '3s'
            }}
          />
          
          <path
            d="M 300,500 L 600,600 L 800,650 L 750,800 L 500,800 L 250,650 Z"
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="1.5"
          />
          <path
            d="M 300,500 L 600,600 L 800,650 L 750,800 L 500,800 L 250,650 Z"
            fill="none"
            stroke="url(#lightGradient3)"
            strokeWidth="4"
            strokeDasharray="30 300"
            strokeDashoffset="0"
            style={{
              animation: 'lightMove 13s linear infinite',
              filter: 'blur(4px)',
              opacity: 0.9,
              animationDelay: '5s'
            }}
          />
          
          {/* Puntos de conexión/nodos en las intersecciones */}
          <circle cx="350" cy="0" r="4" fill="rgba(255, 255, 255, 0.5)" />
          <circle cx="420" cy="180" r="4" fill="rgba(255, 255, 255, 0.5)" />
          <circle cx="280" cy="320" r="4" fill="rgba(255, 255, 255, 0.5)" />
          <circle cx="520" cy="300" r="4" fill="rgba(255, 255, 255, 0.5)" />
          <circle cx="680" cy="250" r="4" fill="rgba(255, 255, 255, 0.5)" />
          <circle cx="900" cy="380" r="4" fill="rgba(255, 255, 255, 0.5)" />
          <circle cx="1100" cy="350" r="4" fill="rgba(255, 255, 255, 0.5)" />
          <circle cx="600" cy="600" r="4" fill="rgba(255, 255, 255, 0.5)" />
          <circle cx="300" cy="500" r="4" fill="rgba(255, 255, 255, 0.5)" />
        </svg>
        
        {/* Estilos de animación */}
        <style dangerouslySetInnerHTML={{ __html: backgroundStyles }} />
        <Card style={{ width: '100%', maxWidth: isKycEmbedded ? '1400px' : '650px' }} className="shadow-lg border-0">
          {/* Header con Logo */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            borderRadius: '0.375rem 0.375rem 0 0'
          }}>
            <Image 
              src="/logo.webp" 
              alt="Datia" 
              width={200} 
              height={70} 
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          
          <Card.Body className="p-4" style={{ backgroundColor: '#ffffff' }}>
            {/* Indicador de progreso */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small" style={{ color: '#666', fontWeight: 500 }}>{t('steps.step', { current: currentStep })}</span>
                <span className="small" style={{ color: '#667eea', fontWeight: 600 }}>
                  {currentStep === 1 && t('steps.welcome')}
                  {currentStep === 2 && t('steps.password')}
                  {currentStep === 3 && t('steps.tour')}
                  {currentStep === 4 && t('steps.verification')}
                  {currentStep === 5 && t('steps.completed')}
                </span>
              </div>
              <ProgressBar
                now={(currentStep / 5) * 100}
                style={{ 
                  height: '10px', 
                  borderRadius: '10px',
                  backgroundColor: '#e9ecef'
                }}
              >
                <div style={{
                  width: `${(currentStep / 5) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '10px',
                  transition: 'width 0.3s ease'
                }} />
              </ProgressBar>
            </div>

            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-4">
                {error}
              </Alert>
            )}

            {/* Paso 1: Bienvenida */}
            {currentStep === 1 && (
              <WelcomeStep
                userName={onboardingInfo.userName}
                organizationName={onboardingInfo.organizationName}
                onNext={handleNext}
              />
            )}

            {/* Paso 2: Contraseña */}
            {currentStep === 2 && (
              <div>
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <div style={{
                      width: '80px',
                      height: '80px',
                      margin: '0 auto',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className="bi bi-lock-fill text-white" style={{ fontSize: '2.5rem' }}></i>
                    </div>
                  </div>
                  <h3 className="mb-2" style={{ color: '#1a1a1a', fontWeight: 600 }}>{t('password.title')}</h3>
                  <p style={{ color: '#666', fontSize: '1rem' }}>
                    {t('password.subtitle')}
                  </p>
                  {passwordSaved && (
                    <Alert variant="info" className="mt-3">
                      <small>
                        <i className="bi bi-info-circle me-2"></i>
                        {t('password.alreadySet')}
                      </small>
                    </Alert>
                  )}
                </div>

                <Form onSubmit={handlePasswordSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t('password.passwordLabel')}</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-lock"></i>
                      </span>
                      <Form.Control
                        type="password"
                        placeholder={t('password.passwordPlaceholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        minLength={8}
                      />
                    </div>
                    <Form.Text className="text-muted">
                      {t('password.passwordHelp')}
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>{t('password.confirmPasswordLabel')}</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-lock-fill"></i>
                      </span>
                      <Form.Control
                        type="password"
                        placeholder={t('password.confirmPasswordPlaceholder')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        minLength={8}
                      />
                    </div>
                  </Form.Group>

                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-secondary"
                      onClick={handlePrevious}
                      disabled={loading}
                      style={{ borderRadius: '6px', fontWeight: 500 }}
                    >
                      <i className="bi bi-arrow-left me-2"></i>
                      {tCommon('previous')}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-grow-1"
                      disabled={loading}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        padding: '12px'
                      }}
                    >
                      {loading ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          {t('password.saving')}
                        </>
                      ) : (
                        <>
                          {t('password.continue')}
                          <i className="bi bi-arrow-right ms-2"></i>
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              </div>
            )}

            {/* Paso 3: Tour */}
            {currentStep === 3 && (
              <TutorialStep
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSkip={() => {
                  // Si omite el tour, ir directamente al KYC
                  setCurrentStep(4);
                  saveOnboardingState(4, passwordSaved);
                }}
              />
            )}

            {/* Paso 4: KYC */}
            {currentStep === 4 && (
              <div>
                <KycStep
                  organizationId={onboardingInfo.organizationId}
                  activationToken={token!}
                  kycURL={onboardingInfo.kycURL}
                  initialStatus={onboardingInfo.verificationStatus}
                  onVerified={handleKycVerifiedAndRedirect}
                  onGoToLogin={() => {
                    // Limpiar estado guardado y redirigir al login
                    clearOnboardingState();
                    router.push('/auth/admin/login?message=kyc-completed');
                  }}
                  onPrevious={handlePrevious}
                  onEmbeddedChange={setIsKycEmbedded}
                />
              </div>
            )}

            {/* Paso 5: Completado */}
            {currentStep === 5 && accountActivated && (
              <div className="text-center">
                <div style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <i className="bi bi-check-circle-fill text-white" style={{ fontSize: '2.5rem' }}></i>
                </div>
                <h3 className="mb-2" style={{ color: '#1a1a1a', fontWeight: 600 }}>{t('completed.title')}</h3>
                <p style={{ color: '#666', fontSize: '0.95rem' }}>
                  {t('completed.redirecting')}
                </p>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    );
  }

  // Si no es primer admin, mostrar solo formulario de contraseña (comportamiento original)
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <Card style={{ width: '100%', maxWidth: '500px' }} className="shadow-lg border-0">
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          borderRadius: '0.375rem 0.375rem 0 0'
        }}>
          <Image 
            src="/logo.webp" 
            alt="Datia" 
            width={200} 
            height={70} 
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        <Card.Body className="p-4" style={{ backgroundColor: '#ffffff' }}>
          <div className="text-center mb-4">
            <div className="mb-3">
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="bi bi-person-check-fill text-white" style={{ fontSize: '2.5rem' }}></i>
              </div>
            </div>
            <h2 className="mb-2" style={{ color: '#1a1a1a', fontWeight: 600 }}>{t('account.title')}</h2>
            <p style={{ color: '#666', fontSize: '1rem' }}>{t('account.subtitle')}</p>
          </div>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Alert variant="info" className="mb-4">
            <small>
              <i className="bi bi-info-circle me-2"></i>
              {t('account.pendingActivation')}
            </small>
          </Alert>

          <Form onSubmit={handlePasswordSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>{t('password.passwordLabel')}</Form.Label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-lock"></i>
                </span>
                <Form.Control
                  type="password"
                  placeholder={t('password.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                />
              </div>
              <Form.Text className="text-muted">
                {t('password.passwordHelp')}
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>{t('password.confirmPasswordLabel')}</Form.Label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-lock-fill"></i>
                </span>
                <Form.Control
                  type="password"
                  placeholder={t('password.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                />
              </div>
            </Form.Group>

            <Button
              type="submit"
              className="w-100"
              size="lg"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                padding: '14px',
                boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'
              }}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  {t('account.activating')}
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  {t('account.activate')}
                </>
              )}
            </Button>
          </Form>

          <hr className="my-4" />

          <div className="text-center">
            <small className="text-muted">
              {t('account.alreadyHaveAccount')}{' '}
              <a href="/auth/admin/login" className="text-primary">
                {t('account.login')}
              </a>
            </small>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default function ActivateAccountPage() {
  return (
    <Suspense fallback={
      <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    }>
      <ActivateAccountForm />
    </Suspense>
  );
}
