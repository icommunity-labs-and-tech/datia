'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Alert, Button, Center, Loader, Paper, PasswordInput, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangleFilled, IconCircleCheck } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { checkResetTokenAction, resetPasswordAction } from '@/actions/auth/password-reset';

const MIN_LENGTH = 8;

function ResetPasswordForm() {
  const t = useTranslations('auth.recovery');
  const token = useSearchParams().get('token') ?? '';
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    checkResetTokenAction(token).then((ok) => alive && setValid(ok)).catch(() => alive && setValid(false));
    return () => {
      alive = false;
    };
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_LENGTH) return setError(t('errors.weakPassword', { min: MIN_LENGTH }));
    if (password !== confirm) return setError(t('errors.mismatch'));

    setSaving(true);
    setError(null);
    try {
      const result = await resetPasswordAction(token, password);
      if (result.success) setDone(true);
      else if (result.error === 'weak_password') setError(t('errors.weakPassword', { min: MIN_LENGTH }));
      else if (result.error === 'rate_limited') setError(t('errors.tooManyAttempts'));
      else setValid(false);
    } catch {
      setError(t('errors.failed'));
    } finally {
      setSaving(false);
    }
  };

  if (valid === null) return <Center py="xl"><Loader size="sm" /></Center>;

  if (done) {
    return (
      <Stack gap="md" align="center" ta="center">
        <IconCircleCheck size={40} stroke={1.5} color="var(--mantine-color-teal-6)" />
        <Title order={3}>{t('done.title')}</Title>
        <Text size="sm" c="dimmed">{t('done.body')}</Text>
        <Link href="/auth/admin/login">{t('backToLogin')}</Link>
      </Stack>
    );
  }

  if (!valid) {
    return (
      <Stack gap="md" align="center" ta="center">
        <IconAlertTriangleFilled size={36} color="var(--mantine-color-red-6)" />
        <Title order={3}>{t('invalid.title')}</Title>
        <Text size="sm" c="dimmed">{t('invalid.body')}</Text>
        <Link href="/auth/forgot-password">{t('invalid.askAgain')}</Link>
      </Stack>
    );
  }

  return (
    <form onSubmit={submit}>
      <Stack gap="md">
        <Title order={3}>{t('reset.title')}</Title>
        <Text size="sm" c="dimmed">{t('reset.description', { min: MIN_LENGTH })}</Text>
        {error && <Alert color="red" variant="light" icon={<IconAlertTriangleFilled size={16} />}>{error}</Alert>}
        <PasswordInput
          label={t('reset.passwordLabel')}
          required
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          data-autofocus
        />
        <PasswordInput
          label={t('reset.confirmLabel')}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.currentTarget.value)}
        />
        <Button type="submit" loading={saving}>{t('reset.submit')}</Button>
      </Stack>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f8fafc' }}>
      <Paper withBorder radius="md" p="xl" maw={420} w="100%">
        <Suspense fallback={<Center py="xl"><Loader size="sm" /></Center>}>
          <ResetPasswordForm />
        </Suspense>
      </Paper>
    </div>
  );
}
