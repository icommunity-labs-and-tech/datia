'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Anchor, Badge, Code, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconBolt, IconCloudFog, IconGauge, IconPackage } from '@tabler/icons-react';
import PageHeader from '@/components/layout/PageHeader';

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'yellow',
  VERIFIED: 'green',
  REJECTED: 'red',
};

interface Props {
  emission: any;
}

export default function EmissionDetailClient({ emission }: Props) {
  const t = useTranslations('emissionDetail');
  const tEnergy = useTranslations('energyHub');
  const tLifecycle = useTranslations('organizationAssetDetail');
  const tScope = useTranslations('dashboard.scope');
  const locale = useLocale();

  const consumption = emission.EnergyConsumption;
  const source = consumption.EnergySource;
  const item = source.Asset;

  const dateTime = (value: Date | string) => new Date(value).toLocaleString(locale);
  const dateOnly = (value: Date | string) => new Date(value).toLocaleDateString(locale);
  const humanize = (value: string | null | undefined) => (value ? value.replace(/_/g, ' ').toLowerCase() : '—');

  const chain = [
    { icon: IconPackage, label: t('chain.asset'), value: item.name, href: `/dashboard/assets/${item.id}` },
    { icon: IconBolt, label: t('chain.source'), value: source.name, sub: tEnergy(`carriers.${source.energyCarrier}`) },
    { icon: IconGauge, label: t('chain.consumption'), value: `${consumption.consumptionKwh} kWh`, sub: tLifecycle(`lifecycle.${consumption.lifecycleStage}`) },
    { icon: IconCloudFog, label: t('chain.emission'), value: `${emission.co2eKg} kg CO₂e`, sub: tScope(emission.scope) },
  ];

  return (
    <>
      <Anchor
        component={Link}
        href="/dashboard/energy/emissions"
        size="sm"
        mb="xs"
        display="inline-flex"
        style={{ alignItems: 'center', gap: 6 }}
      >
        <IconArrowLeft size={14} />
        {tEnergy('navEmissions')}
      </Anchor>

      <PageHeader
        title={t('title')}
        actions={
          <Badge variant="light" color={STATUS_COLOR[emission.verificationStatus] ?? 'gray'}>
            {tEnergy(`status.${emission.verificationStatus}`)}
          </Badge>
        }
      />

      <Group gap="sm" mb="lg" align="stretch" wrap="wrap">
        {chain.map((node, i) => (
          <Group key={node.label} gap="sm" wrap="nowrap">
            <Paper withBorder radius="md" p="sm" miw={150} ta="center">
              <ThemeIcon color="datiaBlue" variant="light" size={28} radius="md" mx="auto" mb={6}>
                <node.icon size={15} />
              </ThemeIcon>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{node.label}</Text>
              {node.href ? (
                <Anchor component={Link} href={node.href} size="sm" fw={600}>{node.value}</Anchor>
              ) : (
                <Text size="sm" fw={600}>{node.value}</Text>
              )}
              {node.sub && <Text size="xs" c="dimmed">{node.sub}</Text>}
            </Paper>
            {i < chain.length - 1 && <IconArrowRight size={16} color="var(--mantine-color-gray-5)" />}
          </Group>
        ))}
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Section title={t('emission.title')}>
          <Row label={t('emission.co2e')} value={<Text size="sm" fw={600}>{emission.co2eKg} kg</Text>} />
          <Row label={t('emission.scope')} value={tScope(emission.scope)} />
          <Row label={t('emission.boundary')} value={humanize(emission.systemBoundary)} />
          <Row label={t('emission.factor')} value={emission.emissionFactor ?? '—'} />
          <Row label={t('emission.factorSource')} value={emission.emissionFactorSource ?? '—'} />
          <Row label={t('emission.methodology')} value={emission.calculationMethodology ?? '—'} />
          <Row label={t('emission.gwp')} value={emission.gwpCharacterizationFactors ?? 'IPCC AR6'} />
          <Row label={t('emission.functionalUnit')} value={emission.functionalUnit ?? '—'} />
          <Row label={t('emission.registered')} value={dateTime(emission.createdAt)} />
        </Section>

        <Section title={t('verification.title')}>
          <Row
            label={t('verification.status')}
            value={
              <Badge variant="light" color={STATUS_COLOR[emission.verificationStatus] ?? 'gray'}>
                {tEnergy(`status.${emission.verificationStatus}`)}
              </Badge>
            }
          />
          <Row label={t('verification.verifier')} value={emission.verifierBody ?? '—'} />
          <Row label={t('verification.standard')} value={emission.verificationStandard ?? '—'} />
          {emission.verificationStatus === 'PENDING' && (
            <Text size="sm" c="dimmed" mt="xs">
              {t('verification.pendingHint')}{' '}
              <Code>POST /api/v1/emissions/{emission.id}/certify</Code>
            </Text>
          )}
        </Section>

        <Section title={t('consumption.title')}>
          <Row label={t('consumption.period')} value={`${dateOnly(consumption.periodStart)} → ${dateOnly(consumption.periodEnd)}`} />
          <Row label={t('consumption.amount')} value={<Text size="sm" fw={600}>{consumption.consumptionKwh} kWh / {consumption.consumptionMj ?? (consumption.consumptionKwh * 3.6).toFixed(2)} MJ</Text>} />
          <Row label={t('consumption.stage')} value={tLifecycle(`lifecycle.${consumption.lifecycleStage}`)} />
          <Row label={t('consumption.measurementStandard')} value={consumption.measurementStandard ?? '—'} />
          {consumption.costAmount != null && (
            <Row label={t('consumption.cost')} value={`${consumption.costAmount} ${consumption.currency ?? ''}`.trim()} />
          )}
        </Section>

        <Section title={t('source.title')}>
          <Row label={t('source.name')} value={<Text size="sm" fw={600}>{source.name}</Text>} />
          <Row label={t('source.carrier')} value={tEnergy(`carriers.${source.energyCarrier}`)} />
          {source.generationTechnology && <Row label={t('source.technology')} value={source.generationTechnology} />}
          {source.renewableShare != null && <Row label={t('source.renewable')} value={`${source.renewableShare}%`} />}
          {source.gridEmissionFactor != null && <Row label={t('source.gridFactor')} value={`${source.gridEmissionFactor} gCO₂/kWh`} />}
          {source.countryOfOrigin && <Row label={t('source.country')} value={source.countryOfOrigin} />}
          {source.guaranteeOfOriginId && <Row label={t('source.guarantee')} value={<Code>{source.guaranteeOfOriginId}</Code>} />}
        </Section>
      </SimpleGrid>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Title order={5} mb="sm">{title}</Title>
      <Stack gap={6}>{children}</Stack>
    </Paper>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md" align="flex-start">
      <Text size="sm" c="dimmed">{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? <Text size="sm" ta="right">{value}</Text> : value}
    </Group>
  );
}
