'use client';

import { useState, useEffect, Suspense } from 'react';
import { Loader } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthSeparated, AuthProvider } from '@/hooks/useAuthSeparated';
import { useTranslations } from 'next-intl';
import LoginPageLayout from '@/components/auth/LoginPageLayout';

interface OrgLoginFormProps {
  slug: string;
  orgName: string;
  logoUrl: string | null;
  brandColor?: string;
  brandColorSecondary?: string;
}

function OrgLoginContent({ slug, orgName, logoUrl, brandColor, brandColorSecondary }: OrgLoginFormProps) {
  const t = useTranslations('auth.login.org.admin');
  const tCommon = useTranslations('common.actions');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, login } = useAuthSeparated();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!user || loading) return;
    if (user.role === 'ADMIN') router.push('/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    const e = searchParams.get('error');
    if (e === 'AccessDenied') setError(t('errors.accessDenied'));
    else if (e === 'Unauthorized') setError(t('errors.unauthorized'));
  }, [searchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await login(email, password);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || t('errors.invalidCredentials'));
      }
    } catch {
      setError(t('errors.loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader color="datiaBlue" aria-label={tCommon('loading')} />
      </div>
    );
  }

  return (
    <LoginPageLayout
      logoUrl={logoUrl}
      orgName={orgName}
      brandColor={brandColor}
      brandColorSecondary={brandColorSecondary}
      poweredByText={t('poweredBy')}
      subtitle={t('subtitle')}
      emailPlaceholder={t('emailPlaceholder')}
      passwordPlaceholder={t('passwordPlaceholder')}
      accessText={t('access')}
      accessingText={t('accessing')}
      email={email}
      password={password}
      isLoading={isLoading}
      error={error}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
    />
  );
}

export default function OrgLoginForm(props: OrgLoginFormProps) {
  return (
    <AuthProvider>
      <Suspense fallback={
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
          <Loader color="datiaBlue" />
        </div>
      }>
        <OrgLoginContent {...props} />
      </Suspense>
    </AuthProvider>
  );
}
