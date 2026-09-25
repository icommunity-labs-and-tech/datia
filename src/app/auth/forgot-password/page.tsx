'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconAlertTriangleFilled, IconMailCheck } from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';
import { requestPasswordResetAction } from '@/actions/auth/password-reset';

/**
 * Asks for a reset link. Whatever the address, the answer is the same: the page
 * says a link is on its way if the account exists (#36).
 */
export default function ForgotPasswordPage() {
  const t = useTranslations('auth.recovery');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const result = await requestPasswordResetAction(email, locale === 'en' ? 'en' : 'es');
      if (result.success) setSent(true);
      else setError(t('errors.tooManyAttempts'));
    } catch {
      setError(t('errors.failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f8fafc' }}>
      <Paper withBorder radius="md" p="xl" maw={420} w="100%">
        {sent ? (
          <Stack gap="md" align="center" ta="center">
            <IconMailCheck size={40} stroke={1.5} color="var(--mantine-color-teal-6)" />
            <Title order={3}>{t('sent.title')}</Title>
            <Text size="sm" c="dimmed">{t('sent.body', { email })}</Text>
            <Text size="xs" c="dimmed">{t('sent.hint')}</Text>
            <Link href="/auth/admin/login">{t('backToLogin')}</Link>
          </Stack>
        ) : (
          <form onSubmit={submit}>
            <Stack gap="md">
              <Title order={3}>{t('request.title')}</Title>
              <Text size="sm" c="dimmed">{t('request.description')}</Text>
              {error && (
                <Alert color="red" variant="light" icon={<IconAlertTriangleFilled size={16} />}>{error}</Alert>
              )}
              <TextInput
                label={t('emailLabel')}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                data-autofocus
              />
              <Button type="submit" loading={sending}>{t('request.submit')}</Button>
              <Text size="sm" ta="center"><Link href="/auth/admin/login">{t('backToLogin')}</Link></Text>
            </Stack>
          </form>
        )}
      </Paper>
    </div>
  );
}
