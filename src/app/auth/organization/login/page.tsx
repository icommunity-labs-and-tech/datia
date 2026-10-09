'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import LoginPageLayout from '@/components/auth/LoginPageLayout';

/** Datia's own blue, not the superadmin panel's red — this is a customer's login. */
const ORGANIZATION_COLOR = '#1752CC';

export default function OrganizationLoginPage() {
  const t = useTranslations('auth.login.organization');
  const tRecovery = useTranslations('auth.recovery');
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
      const response = await fetch('/api/auth/organization/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/organization/companies');
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
      brandColor={ORGANIZATION_COLOR}
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
