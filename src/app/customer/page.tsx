'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Center, Group, Paper, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { IconQrcode, IconSearch } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import PassportShell from './components/PassportShell';

export default function CustomerPage() {
  const t = useTranslations('customer');
  const router = useRouter();
  const [code, setCode] = useState('');

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = code.trim();
      if (trimmed) router.push(`/customer/asset/${trimmed}`);
    },
    [code, router]
  );

  return (
    <PassportShell>
      <Center mih="60vh">
        <Paper p="xl" radius="md" w="100%" maw={420}>
          <Stack align="center" gap="xs" mb="lg">
            <ThemeIcon color="datiaBlue" variant="light" size={56} radius="xl">
              <IconQrcode size={28} stroke={1.5} />
            </ThemeIcon>
            <Title order={3} ta="center">{t('scanCode')}</Title>
            <Text size="sm" c="dimmed" ta="center">{t('scanDescription')}</Text>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Group gap="xs" wrap="nowrap" align="flex-end">
              <TextInput
                flex={1}
                label={t('manualInput')}
                value={code}
                onChange={(event) => setCode(event.currentTarget.value)}
                leftSection={<IconSearch size={15} stroke={1.7} />}
              />
              <Button type="submit" disabled={!code.trim()}>
                {t('search')}
              </Button>
            </Group>
          </form>
        </Paper>
      </Center>
    </PassportShell>
  );
}
