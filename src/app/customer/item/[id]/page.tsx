'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Center, Loader, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { ItemPassport } from '../../components/ItemPassport';
import PassportShell from '../../components/PassportShell';
import { ItemData } from '../../types';

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('customer');
  const router = useRouter();
  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string>('');

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setItemId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    const fetchItemData = async () => {
      if (!itemId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/customer/item/${itemId}`);
        if (!response.ok) {
          throw new Error(t('productNotFound'));
        }

        const data = await response.json();
        setItemData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorGettingProduct'));
        setItemData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchItemData();
  }, [itemId]);

  if (loading) {
    return (
      <PassportShell>
        <Center py={80}>
          <Stack align="center" gap="sm">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">{t('loadingProduct')}</Text>
          </Stack>
        </Center>
      </PassportShell>
    );
  }

  if (error || !itemData) {
    return (
      <PassportShell>
        <Paper p="xl" radius="md">
          <Center>
            <Stack align="center" gap="sm" maw={380}>
              <ThemeIcon color="red" variant="light" size={52} radius="xl">
                <IconAlertCircle size={26} stroke={1.5} />
              </ThemeIcon>
              <Title order={4} ta="center">{t('productNotFound')}</Title>
              <Text size="sm" c="dimmed" ta="center">
                {error || t('productNotFoundMessage')}
              </Text>
              <Button variant="light" size="xs" onClick={() => router.push('/customer')}>
                {t('error.backToScanner')}
              </Button>
            </Stack>
          </Center>
        </Paper>
      </PassportShell>
    );
  }

  return (
    <PassportShell organization={itemData.organization}>
      <ItemPassport item={itemData} onBack={() => router.push('/customer')} />
    </PassportShell>
  );
}
