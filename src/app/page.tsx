'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('apps');
  const router = useRouter();

  useEffect(() => {
    router.push('/apps');
  }, [router]);

  return (
    <Center mih="100vh" bg="var(--mantine-color-gray-0)">
      <Stack align="center" gap="sm">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">{t('redirecting')}</Text>
      </Stack>
    </Center>
  );
}
