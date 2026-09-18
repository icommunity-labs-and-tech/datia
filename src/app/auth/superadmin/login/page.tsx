'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import LoginPageLayout from '@/components/auth/LoginPageLayout';

/** Rojo propio del panel de superadmin, para no confundirlo con el login de admin. */
const SUPERADMIN_COLOR = '#b91c1c';

export default function SuperAdminLoginPage() {
  const t = useTranslations('auth.login.superadmin');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    />
  );
}
