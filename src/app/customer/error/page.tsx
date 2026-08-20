'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button, Center, Group, Loader, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import PassportShell from '../components/PassportShell';

function ErrorPageContent() {
  const t = useTranslations('customer.error');
  const router = useRouter();
  const searchParams = useSearchParams();

  const error = searchParams.get('error') || t('unknownError');
  const code = searchParams.get('code') || '';

  return (
    <PassportShell>
      <Center mih="60vh">
        <Paper p="xl" radius="md" w="100%" maw={420}>
          <Stack align="center" gap="sm">
            <ThemeIcon color="red" variant="light" size={52} radius="xl">
              <IconAlertCircle size={26} stroke={1.5} />
            </ThemeIcon>
            <Title order={4} ta="center">{t('title')}</Title>
            <Text size="sm" c="dimmed" ta="center">{error}</Text>

            <Group gap="xs" mt="xs">
              <Button variant="light" size="xs" onClick={() => router.push('/customer')}>
                {t('backToScanner')}
              </Button>
              {code && (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => router.push(`/customer/item/${code}`)}
                >
                  {t('tryWithCode', { code })}
                </Button>
              )}
            </Group>
          </Stack>
        </Paper>
      </Center>
    </PassportShell>
  );
}

export default function ErrorPage() {
  const t = useTranslations('customer.error');

  return (
    <Suspense
      fallback={
        <PassportShell>
          <Center py={80}>
            <Stack align="center" gap="sm">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">{t('preparingError')}</Text>
            </Stack>
          </Center>
        </PassportShell>
      }
    >
      <ErrorPageContent />
    </Suspense>
  );
}
