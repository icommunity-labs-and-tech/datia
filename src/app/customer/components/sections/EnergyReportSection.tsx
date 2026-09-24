'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Center,
  Grid,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconCloudFog,
  IconBolt,
  IconSun,
  IconRosetteDiscountCheck,
  IconChartArea,
  IconChartPie,
  IconAward,
  IconLeaf,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { axisProps, gridProps, tooltipStyle, colors } from '@/components/charts/theme';
import { CARRIER_COLORS } from '@/lib/energy/carrierColors';
import type { EnergyReport } from '../../types.energy';

/** GHG scopes keep their own accents so chart, bars and badges agree. */
const SCOPE_COLOR: Record<string, string> = {
  SCOPE_1: colors.blue,
  SCOPE_2: colors.sky,
  SCOPE_3: '#7C3AED',
};

const STAGE_COLOR: Record<string, string> = {
  MANUFACTURING: 'orange',
  TRANSPORT: 'blue',
  USE: 'green',
  MAINTENANCE: 'gray',
  END_OF_LIFE: 'red',
};

interface KpiProps {
  icon: React.ElementType;
  color: string;
  label: string;
  value: string;
  hint?: string;
}

function Kpi({ icon: Icon, color, label, value, hint }: KpiProps) {
  return (
    <Paper p="md" radius="md">
      <ThemeIcon color={color} variant="light" size={26} radius="sm" mb={10}>
        <Icon size={14} stroke={1.7} />
      </ThemeIcon>
      <Text size="xs" c="dimmed" tt="uppercase" fw={650} lts={0.4}>{label}</Text>
      <Text fw={700} fz={24} lh={1.15} mt={2} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Text>
      {hint && <Text size="xs" c="dimmed" mt={2}>{hint}</Text>}
    </Paper>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed" tt="uppercase" lts={0.3}>{label}</Text>
      {typeof value === 'string' ? <Text size="sm" fw={550}>{value}</Text> : value}
    </Stack>
  );
}

export function EnergyReportSection({ assetId }: { assetId: string }) {
  const t = useTranslations('customer.energyReport');
  const [report, setReport] = useState<EnergyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Loaded on demand: the QR landing should not pay for the full ESPR tree.
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/energy/asset/${encodeURIComponent(assetId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: EnergyReport) => { if (!cancelled) setReport(data); })
      .catch(() => { if (!cancelled) setError(t('loadError')); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [assetId, t]);

  const derived = useMemo(() => {
    if (!report) return null;

    const consumptions = report.sources.flatMap((s) => s.consumptions);
    const emissions = consumptions.flatMap((c) => c.emissions);

    const monthly: Record<string, { month: string; kWh: number }> = {};
    for (const c of consumptions) {
      const key = new Date(c.periodStart).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      monthly[key] ??= { month: key, kWh: 0 };
      monthly[key].kWh += c.consumptionKwh;
    }

    const byScope: Record<string, number> = {};
    for (const e of emissions) byScope[e.scope] = (byScope[e.scope] ?? 0) + e.co2eKg;

    return {
      monthly: Object.values(monthly),
      byScope,
      scopeData: Object.entries(byScope).map(([scope, value]) => ({
        name: scope.replace('_', ' '),
        value: +value.toFixed(3),
        fill: SCOPE_COLOR[scope] ?? '#8E97A8',
      })),
    };
  }, [report]);

  if (loading) {
    return (
      <Stack gap="md">
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={104} radius="md" />)}
        </SimpleGrid>
        <Skeleton height={220} radius="md" />
      </Stack>
    );
  }

  if (error) {
    return <Alert color="red" variant="light" radius="md">{error}</Alert>;
  }

  if (!report || report.sources.length === 0) {
    return (
      <Center py={48}>
        <Stack align="center" gap="sm">
          <ThemeIcon color="gray" variant="light" size={48} radius="xl">
            <IconLeaf size={24} stroke={1.5} />
          </ThemeIcon>
          <Text size="sm" c="dimmed" ta="center">{t('noData')}</Text>
        </Stack>
      </Center>
    );
  }

  const { kpis, sources } = report;

  return (
    <Stack gap="lg">
      <Text size="sm" c="dimmed">{t('subtitle')}</Text>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        <Kpi
          icon={IconCloudFog}
          color="gray"
          label={t('kpis.co2')}
          value={`${kpis.totalCo2eKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`}
          hint={`${(kpis.totalCo2eKg / 1000).toFixed(3)} t CO₂e`}
        />
        <Kpi
          icon={IconBolt}
          color="datiaAmber"
          label={t('kpis.energy')}
          value={`${(kpis.totalKwh / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} MWh`}
          hint={`${kpis.totalKwh.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`}
        />
        <Kpi
          icon={IconSun}
          color="green"
          label={t('kpis.renewable')}
          value={kpis.avgRenewableShare != null ? `${kpis.avgRenewableShare.toFixed(0)}%` : '—'}
        />
        <Kpi
          icon={IconRosetteDiscountCheck}
          color="datiaBlue"
          label={t('kpis.certified')}
          value={String(kpis.certifiedEmissions)}
          hint={t('kpis.sources', { count: kpis.sourcesCount })}
        />
      </SimpleGrid>

      <Grid gutter="sm">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper p="md" radius="md" h="100%">
            <Group gap={8} mb="md">
              <IconChartArea size={15} stroke={1.7} color="var(--mantine-color-gray-6)" />
              <Text fw={600} size="sm">{t('charts.monthly')}</Text>
            </Group>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={derived?.monthly ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="reportEnergyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.blue} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={colors.blue} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v.toLocaleString()} kWh`, t('charts.monthly')]}
                />
                <Area
                  type="monotone"
                  dataKey="kWh"
                  stroke={colors.blue}
                  strokeWidth={2}
                  fill="url(#reportEnergyGrad)"
                  dot={{ fill: colors.blue, r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="md" radius="md" h="100%">
            <Group gap={8} mb="md">
              <IconChartPie size={15} stroke={1.7} color="var(--mantine-color-gray-6)" />
              <Text fw={600} size="sm">{t('charts.byScope')}</Text>
            </Group>

            {derived && derived.scopeData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={derived.scopeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={58}
                      innerRadius={36}
                      paddingAngle={3}
                    >
                      {derived.scopeData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(3)} kg CO₂e`]} />
                  </PieChart>
                </ResponsiveContainer>

                <Stack gap={8} mt="sm">
                  {Object.entries(derived.byScope).map(([scope, kg]) => (
                    <Stack key={scope} gap={4}>
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">{scope.replace('_', ' ')}</Text>
                        <Text size="xs" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {kg.toFixed(2)} kg
                        </Text>
                      </Group>
                      <Progress
                        value={kpis.totalCo2eKg > 0 ? (kg / kpis.totalCo2eKg) * 100 : 0}
                        size={5}
                        radius="xl"
                        color={SCOPE_COLOR[scope] ?? 'gray'}
                      />
                    </Stack>
                  ))}
                </Stack>
              </>
            ) : (
              <Center py={40}>
                <Text size="sm" c="dimmed">{t('charts.noEmissions')}</Text>
              </Center>
            )}
          </Paper>
        </Grid.Col>
      </Grid>

      {sources.map((source) => (
        <Paper key={source.id} p="md" radius="md">
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm" mb="md">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon
                variant="light"
                size={34}
                radius="sm"
                style={{
                  color: CARRIER_COLORS[source.energyCarrier as keyof typeof CARRIER_COLORS] ?? undefined,
                }}
              >
                <IconBolt size={17} stroke={1.7} />
              </ThemeIcon>
              <Stack gap={2}>
                <Text fw={600} size="sm">{source.name}</Text>
                <Text size="xs" c="dimmed">
                  {[
                    source.energyCarrier.replace(/_/g, ' '),
                    source.capacityKw ? `${source.capacityKw.toLocaleString()} kW` : null,
                    source.renewableShare != null ? t('source.renewable', { share: source.renewableShare }) : null,
                    source.countryOfOrigin,
                  ].filter(Boolean).join(' · ')}
                </Text>
              </Stack>
            </Group>

            {source.guaranteeOfOriginId && (
              <Badge
                variant="light"
                color="green"
                leftSection={<IconAward size={12} />}
                title={t('source.guarantee')}
              >
                {source.guaranteeOfOriginId}
              </Badge>
            )}
          </Group>

          <Stack gap="md">
            {source.consumptions.filter((c) => c.emissions.length > 0).map((c) => (
              <Stack
                key={c.id}
                gap="sm"
                pt="md"
                style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}
              >
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                  <Field
                    label={t('consumption.period')}
                    value={`${new Date(c.periodStart).toLocaleDateString()} – ${new Date(c.periodEnd).toLocaleDateString()}`}
                  />
                  <Field
                    label={t('consumption.consumption')}
                    value={`${c.consumptionKwh.toLocaleString()} kWh`}
                  />
                  <Field
                    label={t('consumption.stage')}
                    value={
                      <Badge
                        size="sm"
                        variant="light"
                        color={STAGE_COLOR[c.lifecycleStage] ?? 'gray'}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        {c.lifecycleStage.replace(/_/g, ' ')}
                      </Badge>
                    }
                  />
                  {c.measurementStandard && (
                    <Field
                      label={t('consumption.standard')}
                      value={<Text size="xs" ff="monospace">{c.measurementStandard}</Text>}
                    />
                  )}
                </SimpleGrid>

                {c.emissions.map((e) => (
                  <Paper key={e.id} p="sm" radius="sm" bg="var(--mantine-color-gray-0)" withBorder={false}>
                    <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
                      <Field
                        label={t('emission.co2')}
                        value={
                          <Text fw={700} size="md" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {e.co2eKg.toFixed(3)} kg
                          </Text>
                        }
                      />
                      <Field
                        label={t('emission.scope')}
                        value={
                          <Text size="sm" fw={600} c={SCOPE_COLOR[e.scope] ? undefined : 'dimmed'}>
                            {e.scope.replace('_', ' ')}
                          </Text>
                        }
                      />
                      <Field
                        label={t('emission.methodology')}
                        value={<Text size="xs" ff="monospace">{e.calculationMethodology ?? '—'}</Text>}
                      />
                      <Field
                        label={t('emission.factor')}
                        value={e.emissionFactor != null ? `${e.emissionFactor} kgCO₂e/kWh` : '—'}
                      />
                      {e.emissionFactorSource && (
                        <Field label={t('emission.factorSource')} value={e.emissionFactorSource} />
                      )}
                      {e.gwpCharacterizationFactors && (
                        <Field label={t('emission.gwp')} value={e.gwpCharacterizationFactors} />
                      )}
                      {e.verifierBody && (
                        <Field
                          label={t('emission.verifier')}
                          value={
                            <Group gap={4} wrap="nowrap">
                              <IconRosetteDiscountCheck size={14} stroke={1.7} color="var(--mantine-color-green-6)" />
                              <Text size="sm" fw={600}>{e.verifierBody}</Text>
                            </Group>
                          }
                        />
                      )}
                      {e.verificationStandard && (
                        <Field
                          label={t('emission.verificationStandard')}
                          value={<Text size="xs" ff="monospace">{e.verificationStandard}</Text>}
                        />
                      )}
                    </SimpleGrid>
                  </Paper>
                ))}
              </Stack>
            ))}
          </Stack>
        </Paper>
      ))}

      <Group gap={6} justify="center" c="dimmed">
        <IconRosetteDiscountCheck size={13} stroke={1.7} />
        <Text size="xs">{t('footer')}</Text>
      </Group>
    </Stack>
  );
}
