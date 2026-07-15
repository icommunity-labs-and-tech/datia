'use client';

import { useState, useEffect, Suspense } from 'react';
import { Spinner } from 'react-bootstrap';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthSeparated, AuthProvider } from '@/hooks/useAuthSeparated';
import { useTranslations } from 'next-intl';
import LoginPageLayout from '@/components/auth/LoginPageLayout';

function AdminLoginContent() {
  const t = useTranslations('auth.login.admin');
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
    if (user && !loading && user.role === 'ADMIN') router.push('/dashboard');
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
      if (result.success) { router.push('/dashboard'); }
      else { setError(result.error || t('errors.invalidCredentials')); }
    } catch {
      setError(t('errors.loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner animation="border" variant="primary">
          <span className="visually-hidden">{tCommon('loading')}</span>
        </Spinner>
      </div>
    );
  }

  return (
    <LoginPageLayout
      role="admin"
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

export default function AdminLoginPage() {
  const tCommon = useTranslations('common.actions');
  return (
    <AuthProvider>
      <Suspense fallback={
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner animation="border" variant="primary">
            <span className="visually-hidden">{tCommon('loading')}</span>
          </Spinner>
        </div>
      }>
        <AdminLoginContent />
      </Suspense>
    </AuthProvider>
  );
}
