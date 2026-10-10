'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import LoginPageLayout from '@/components/auth/LoginPageLayout';

/** Rojo propio del panel de superadmin, para no confundirlo con el login de admin. */
const SUPERADMIN_COLOR = '#b91c1c';

export default function SuperAdminLoginPage() {
  const t = useTranslations('auth.login.superadmin');
  const tRecovery = useTranslations('auth.recovery');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Production has no password login any more — IAP is the only way in
    // (#20 follow-up). Reaching this URL there only happens via a stale
    // link, since the panel's own nav never points here; `/superadmin`'s own
    // layout is where the real check (and any "access denied") happens.
    if (process.env.NODE_ENV === 'production') {
      router.replace('/superadmin');
    }
  }, [router]);

  if (process.env.NODE_ENV === 'production') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/superadmin');
      } else if (response.status === 429) {
        setError(t('errors.tooManyAttempts'));
      } else if (response.status === 400 || response.status === 401) {
        setError(t('errors.invalidCredentials'));
      } else {
        setError(t('errors.loginError'));
      }
    } catch {
      setError(t('errors.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginPageLayout
      brandColor={SUPERADMIN_COLOR}
      subtitle={t('subtitle')}
      emailPlaceholder={t('emailPlaceholder')}
      passwordPlaceholder={t('passwordPlaceholder')}
      accessText={t('access')}
      accessingText={t('accessing')}
      email={email}
      password={password}
      isLoading={loading}
      error={error}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      forgotLabel={tRecovery('forgotLink')}
      forgotHref="/auth/forgot-password"
    />
  );
}
