'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Button,
  Center,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconBuilding,
  IconCertificate,
  IconPackage,
  IconUsers,
} from '@tabler/icons-react';
import PageHeader from '@/components/layout/PageHeader';
import type { OrganizationOverview as OrganizationOverviewData } from '@/actions/organizations/get-overview';

export default function OrganizationOverview({ overview }: { overview: OrganizationOverviewData }) {
  const t = useTranslations('organizationOverview');

  if (overview.companiesCount === 0) {
    return (
      <>
        <PageHeader title={t('title')} description={t('description')} />
        <Paper withBorder radius="md" p="xl">
          <Center>
            <Text size="sm" c="dimmed">{t('empty')}</Text>
          </Center>
        </Paper>
      </>
    );
  }

  const stats = [
    {
      icon: IconBuilding,
      label: t('stats.companies'),
      value: overview.companiesCount,
      detail: t('stats.companiesDetail', { active: overview.activeCompaniesCount }),
    },
    {
      icon: IconUsers,
      label: t('stats.accounts'),
      value: overview.activeAccountsCount + overview.pendingAccountsCount,
      detail: t('stats.accountsDetail', {
        active: overview.activeAccountsCount,
        pending: overview.pendingAccountsCount,
      }),
    },
    {
      icon: IconPackage,
      label: t('stats.assets'),
      value: overview.totalAssets,
    },
    {
      icon: IconCertificate,
      label: t('stats.certifications'),
      value: overview.totalCertifications,
      detail:
        overview.totalCertifications > 0
          ? t('stats.certificationsDetail', { certified: overview.certifiedCertifications })
          : undefined,
    },
  ];

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button
            component={Link}
            href="/organization/companies"
            variant="light"
            rightSection={<IconArrowRight size={16} />}
          >
            {t('viewCompanies')}
          </Button>
        }
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {stats.map(({ icon: Icon, label, value, detail }) => (
          <Paper key={label} withBorder radius="md" p="md">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon color="datiaBlue" variant="light" size={36} radius="md">
                <Icon size={18} stroke={1.6} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
                <Title order={3}>{value}</Title>
                {detail && <Text size="xs" c="dimmed">{detail}</Text>}
              </Stack>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>
    </>
  );
}
