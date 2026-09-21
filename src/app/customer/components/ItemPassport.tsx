'use client';

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Image,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconPackage,
  IconShieldCheck,
  IconShieldOff,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ItemData } from '../types';
import { ItemInfoSection, EnergyReportSection } from './sections';
import { VerifiedBadge } from './ui';
import { formatDate } from '../utils/dateFormatters';

interface ItemPassportProps {
  item: ItemData;
  onBack?: () => void;
}

export function ItemPassport({ item, onBack }: ItemPassportProps) {
  const t = useTranslations('common');
  const tCustomer = useTranslations('customer');
  const tPassport = useTranslations('customer.passport');
  const router = useRouter();

  const showEnergy = (item.energyCertifications?.length ?? 0) > 0;
  const isCertified = Boolean(item.evidenceID);

  const handleBack = () => (onBack ? onBack() : router.push('/customer'));

  return (
    <Stack gap="md">
      <Button
        variant="subtle"
        color="gray"
        size="xs"
        leftSection={<IconArrowLeft size={15} stroke={1.7} />}
        onClick={handleBack}
        style={{ alignSelf: 'flex-start' }}
      >
        {t('actions.back')}
      </Button>

      {/* ── Identity ── */}
      <Card p={0} radius="md" style={{ overflow: 'hidden' }}>
        <Group
          gap="md"
          p="md"
          align="flex-start"
          wrap="nowrap"
          style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
        >
          <Box w={72} h={72} style={{ flexShrink: 0 }}>
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt={item.name} w={72} h={72} radius="md" fit="cover" />
            ) : (
              <ThemeIcon variant="light" color="gray" size={72} radius="md">
                <IconPackage size={30} stroke={1.4} />
              </ThemeIcon>
            )}
          </Box>

          <Stack gap={6} style={{ minWidth: 0, flex: 1 }}>
            <Group gap={6} wrap="nowrap">
              <Title order={3} style={{ minWidth: 0 }}>{item.name}</Title>
              {isCertified && <VerifiedBadge title={tCustomer('verifiedProduct')} />}
            </Group>

            {item.category?.name && (
              <Badge size="sm" variant="light" color="gray" style={{ alignSelf: 'flex-start' }}>
                {item.category.name}
              </Badge>
            )}

            <Text size="sm" c="dimmed">
              {item.description || t('noDescription')}
            </Text>
          </Stack>
        </Group>

        <Group gap="xl" px="md" py="sm" wrap="wrap">
          <Stack gap={0}>
            <Text size="xs" c="dimmed">{tPassport('assetId')}</Text>
            <Text size="xs" ff="monospace">{item.id}</Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">{tCustomer('createdAt').replace(':', '')}</Text>
            <Text size="xs" fw={550}>{formatDate(item.createdAt)}</Text>
          </Stack>
        </Group>
      </Card>

      {/* ── Certification status: the reason this page exists ── */}
      <Alert
        variant="light"
        color={isCertified ? 'green' : 'yellow'}
        radius="md"
        icon={isCertified ? <IconShieldCheck size={18} /> : <IconShieldOff size={18} />}
        title={isCertified ? tPassport('certifiedOnChain') : tPassport('notCertified')}
      >
        <Text size="sm">
          {isCertified ? tPassport('certifiedDescription') : tPassport('notCertifiedDescription')}
        </Text>
      </Alert>

      {/* ── Detail ── */}
      <Card p="md" radius="md">
        <Tabs defaultValue="info" keepMounted={false}>
          <Tabs.List mb="md">
            <Tabs.Tab value="info">{tCustomer('tabInfo')}</Tabs.Tab>
            {showEnergy && <Tabs.Tab value="energy">{tCustomer('tabEnergy')}</Tabs.Tab>}
          </Tabs.List>

          <Tabs.Panel value="info">
            <ItemInfoSection item={item} />
          </Tabs.Panel>
          {showEnergy && (
            <Tabs.Panel value="energy">
              <EnergyReportSection itemId={item.id} />
            </Tabs.Panel>
          )}
        </Tabs>
      </Card>
    </Stack>
  );
}
