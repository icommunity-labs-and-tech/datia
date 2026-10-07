'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Card,
  Center,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconShieldLock, IconQrcode, IconArrowRight } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import Logo from '@/components/Logo';
import { appConfig } from '@/config/app';

interface EntryProps {
  href: string;
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
}

function Entry({ href, icon: Icon, color, title, description }: EntryProps) {
  return (
    <Card
      component={Link}
      href={href}
      p="lg"
      radius="md"
      style={{ textDecoration: 'none', color: 'inherit', height: '100%' }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb="md">
        <ThemeIcon variant="light" color={color} size={44} radius="md">
          <Icon size={22} stroke={1.6} />
        </ThemeIcon>
        <IconArrowRight size={16} stroke={1.7} color="var(--mantine-color-gray-5)" />
      </Group>
      <Stack gap={4}>
        <Title order={2} fz="md">{title}</Title>
        <Text size="sm" c="dimmed">{description}</Text>
      </Stack>
    </Card>
  );
}

function AppsSelectContent() {
  const t = useTranslations('apps');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'AccessDenied' || error === 'Unauthorized') {
      router.push('/auth/company/login?error=' + error);
    }
  }, [searchParams, router]);

  return (
    <Box mih="100vh" bg="var(--mantine-color-gray-0)">
      <Container size={640} px="md" py={80}>
        <Stack align="center" gap="xs" mb={48}>
          <Logo href={null} src="/logo-datia.svg" alt="datia" width={128} height={34} priority />
          <Title order={1} fz="h2" ta="center" mt="md">{t('title')}</Title>
          <Text size="sm" c="dimmed" ta="center">{appConfig.description}</Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Entry
            href="/auth/company/login"
            icon={IconShieldLock}
            color="datiaBlue"
            title={t('admin')}
            description={t('adminDescription')}
          />
          <Entry
            href="/customer"
            icon={IconQrcode}
            color="datiaAmber"
            title={t('customer')}
            description={t('customerDescription')}
          />
        </SimpleGrid>
      </Container>
    </Box>
  );
}

export default function AppsSelector() {
  return (
    <Suspense
      fallback={
        <Center mih="100vh" bg="var(--mantine-color-gray-0)">
          <Loader size="sm" />
        </Center>
      }
    >
      <AppsSelectContent />
    </Suspense>
  );
}
