'use client';

/**
 * The three energy views. Each one is a route of its own
 * (/dashboard/energy/{sources,consumption,emissions}) so a visit only loads
 * the data that view needs.
 */

import {
  Paper,
  Text,
  Badge,
  Group,
  Stack,
  ThemeIcon,
  Progress,
  Table,
  Drawer,
  Title,
  Divider,
  SimpleGrid,
} from '@mantine/core';
import {
  IconBolt,
  IconCloudFog,
} from '@tabler/icons-react';
import { useTranslations, useLocale } from 'next-intl';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type {
  EnergySourceRecord,
  EnergyConsumptionRecord,
  EmissionRecord,
  EnergyConsumptionTotals,
  EmissionTotals,
} from '@/domain/energy/EnergyTypes';
import { CARRIER_COLORS } from '@/lib/energy/carrierColors';
import type { EnergyForecast, ForecastHorizon } from '@/lib/projections/energy-forecast';
import type { Heatmap } from '@/lib/energy/heatmap';
import { useEnergyForecast } from './useEnergyForecast';
import { ForecastSection } from './ForecastSection';
import EnergyHeatmap from './EnergyHeatmap';

/** Renders a YYYY-MM key in the reader's locale. */
export function monthLabel(month: string, locale: string) {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString(locale, { month: 'short', year: '2-digit' });
}

// ── Datia palette ────────────────────────────────────────────────────────────

const DATIA_BLUE = '#1752CC';
const DATIA_AMBER = '#F0930A';
const CHART_GRID = 'var(--mantine-color-default-border)';

const SCOPE_COLOR: Record<string, string> = {
  SCOPE_1: DATIA_BLUE, SCOPE_2: '#40c057', SCOPE_3: '#7950f2',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'yellow', VERIFIED: 'green', REJECTED: 'red',
};

// ── Source Detail Drawer ─────────────────────────────────────────────────────

export function SourceDrawer({
  source,
  opened,
  onClose,
  consumption,
}: {
  source: EnergySourceRecord | null;
  opened: boolean;
  onClose: () => void;
  consumption: EnergyConsumptionRecord[];
}) {
  const t = useTranslations('energyHub');
  const locale = useLocale();

  if (!source) return null;

  const srcConsumption = consumption
    .filter((c) => c.energySourceId === source.id)
    .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime())
    .slice(-12);

  const chartData = srcConsumption.map((c) => ({
    label: new Date(c.periodStart).toLocaleDateString(locale, { month: 'short', year: '2-digit' }),
    kWh: +c.consumptionKwh.toFixed(0),
  }));

  const totalKwh = srcConsumption.reduce((s, c) => s + c.consumptionKwh, 0);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={<Title order={5}>{source.name}</Title>}
      position="right"
      size="md"
      padding="md"
    >
      <Stack gap="sm">
        <Group gap="xs">
          <Badge style={{ background: CARRIER_COLORS[source.energyCarrier], color: '#fff' }} size="sm">
            {t(`carriers.${source.energyCarrier}`)}
          </Badge>
          {source.countryOfOrigin && (
            <Badge variant="outline" size="sm">{source.countryOfOrigin}</Badge>
          )}
          {source.guaranteeOfOriginId && (
            <Badge color="datiaAmber" variant="light" size="sm">{t('drawer.goCertified')}</Badge>
          )}
        </Group>

        <SimpleGrid cols={2}>
          {source.capacityKw != null && (
            <Paper withBorder p="xs" radius="sm">
              <Text size="xs" c="dimmed">{t('drawer.capacity')}</Text>
              <Text fw={600}>{source.capacityKw.toLocaleString()} kW</Text>
            </Paper>
          )}
          {source.renewableShare != null && (
            <Paper withBorder p="xs" radius="sm">
              <Text size="xs" c="dimmed">{t('drawer.renewable')}</Text>
              <Group gap={4}>
                <Text fw={600}>{source.renewableShare}%</Text>
                <Progress value={source.renewableShare} size="xs" color="green" style={{ flex: 1 }} />
              </Group>
            </Paper>
          )}
          {source.gridEmissionFactor != null && (
            <Paper withBorder p="xs" radius="sm">
              <Text size="xs" c="dimmed">{t('drawer.emissionFactor')}</Text>
              <Text fw={600}>{source.gridEmissionFactor} gCO₂/kWh</Text>
            </Paper>
          )}
          {source.generationTechnology && (
            <Paper withBorder p="xs" radius="sm">
              <Text size="xs" c="dimmed">{t('drawer.technology')}</Text>
              <Text fw={600}>{source.generationTechnology.replace(/_/g, ' ')}</Text>
            </Paper>
          )}
        </SimpleGrid>

        {source.location && (
          <Text size="sm" c="dimmed">{source.location}</Text>
        )}

        <Divider label={t('drawer.monthlyConsumption')} labelPosition="left" />

        {chartData.length > 0 ? (
          <>
            <Text size="sm" c="dimmed">{t('drawer.total', { kwh: totalKwh.toLocaleString() })}</Text>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="kWh" fill={`${DATIA_BLUE}20`} stroke={DATIA_BLUE} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        ) : (
          <Text size="sm" c="dimmed">{t('drawer.noConsumption')}</Text>
        )}
      </Stack>
    </Drawer>
  );
}

// ── Consumption ─────────────────────────────────────────────────────────────

export function EnergyConsumption({
  consumption,
  sources,
  totals,
  forecast: initialForecast,
  heatmap,
  fetchForecast,
}: {
  consumption: EnergyConsumptionRecord[];
  sources: EnergySourceRecord[];
  totals: EnergyConsumptionTotals;
  forecast: EnergyForecast;
  /** Consumption by source, month by month — the organization panel's company view only (#20). */
  heatmap?: Heatmap;
  fetchForecast?: (horizon: ForecastHorizon) => Promise<EnergyForecast>;
}) {
  const t = useTranslations('energyHub');
  const locale = useLocale();
  const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]));
  const { forecast, horizon, setHorizon, isPending } = useEnergyForecast(initialForecast, fetchForecast);

  // Summary and chart come from the totals, which cover every record; the table
  // below shows the most recent page.
  const chartData = totals.monthly.map(({ month, value }) => ({
    label: monthLabel(month, locale),
    kWh: +value.toFixed(0),
  }));

  return (
    <Stack gap="md">
      <Group>
        <ThemeIcon color="datiaAmber" variant="light" size={36} radius="md">
          <IconBolt size={20} />
        </ThemeIcon>
        <Stack gap={0}>
          <Text fw={700} fz="xl">
            {totals.totalKwh >= 1000
              ? `${(totals.totalKwh / 1000).toFixed(2)} MWh`
              : `${totals.totalKwh.toFixed(0)} kWh`}
          </Text>
          <Text size="xs" c="dimmed">{t('consumptionTab.totalRecorded', { count: totals.records })}</Text>
        </Stack>
      </Group>

      {heatmap && (
        <EnergyHeatmap
          data={heatmap}
          title={t('consumptionTab.heatmapTitle')}
          subtitle={t('consumptionTab.heatmapSubtitle')}
          color={DATIA_AMBER}
          unit="kWh"
          formatValue={(v) => v.toLocaleString(locale, { maximumFractionDigits: 0 })}
        />
      )}

      {chartData.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="sm">{t('consumptionTab.monthlyChart')}</Text>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="kWh" fill={`${DATIA_AMBER}20`} stroke={DATIA_AMBER} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Paper>
      )}

      <ForecastSection
        forecast={forecast}
        horizon={horizon}
        onHorizonChange={setHorizon}
        loading={isPending}
        historicalMonthly={totals.monthly}
        metric="consumption"
        color={DATIA_AMBER}
        unit="kWh"
      />

      <Paper withBorder radius="md" style={{ overflow: 'auto' }}>
        {consumption.length < totals.records && (
          <Text size="xs" c="dimmed" px="md" pt="sm">
            {t('latestRecords', { count: consumption.length, total: totals.records })}
          </Text>
        )}
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('consumptionTab.source')}</Table.Th>
              <Table.Th>{t('consumptionTab.period')}</Table.Th>
              <Table.Th>{t('consumptionTab.consumption')}</Table.Th>
              <Table.Th>{t('consumptionTab.stage')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {consumption.map((c) => (
              <Table.Tr key={c.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>{sourceMap[c.energySourceId]?.name ?? c.energySourceId.slice(0, 8)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {new Date(c.periodStart).toLocaleDateString(locale, { month: 'short', year: 'numeric' })}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={600}>{c.consumptionKwh.toLocaleString()} kWh</Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="xs" variant="outline">{c.lifecycleStage.replace(/_/g, ' ')}</Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}

// ── Tab: Emissions ────────────────────────────────────────────────────────────

export function EnergyEmissions({
  emissions,
  totals,
  forecast: initialForecast,
  heatmap,
  fetchForecast,
}: {
  emissions: EmissionRecord[];
  totals: EmissionTotals;
  forecast: EnergyForecast;
  /** Emissions by GHG scope, month by month — the organization panel's company view only (#20). */
  heatmap?: Heatmap;
  fetchForecast?: (horizon: ForecastHorizon) => Promise<EnergyForecast>;
}) {
  const t = useTranslations('energyHub');
  const locale = useLocale();
  const { forecast, horizon, setHorizon, isPending } = useEnergyForecast(initialForecast, fetchForecast);

  const chartData = totals.monthly.map(({ month, value }) => ({
    label: monthLabel(month, locale),
    co2eKg: +value.toFixed(2),
  }));

  return (
    <Stack gap="md">
      <Group>
        <ThemeIcon color="gray" variant="light" size={36} radius="md">
          <IconCloudFog size={20} />
        </ThemeIcon>
        <Stack gap={0}>
          <Text fw={700} fz="xl">{(totals.totalCo2eKg / 1000).toFixed(3)} tCO₂e</Text>
          <Text size="xs" c="dimmed">
            {t('emissionsTab.verifiedOf', { verified: totals.verified, total: totals.records })}
          </Text>
        </Stack>
      </Group>

      {heatmap && (
        <EnergyHeatmap
          data={heatmap}
          title={t('emissionsTab.heatmapTitle')}
          subtitle={t('emissionsTab.heatmapSubtitle')}
          color="#0D3585"
          unit="kg CO₂e"
          formatValue={(v) => v.toLocaleString(locale, { maximumFractionDigits: 1 })}
        />
      )}

      {chartData.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="sm">{t('emissionsTab.monthlyChart')}</Text>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="co2eKg" name="CO₂e kg" fill="#0D358520" stroke="#0D3585" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Paper>
      )}

      <ForecastSection
        forecast={forecast}
        horizon={horizon}
        onHorizonChange={setHorizon}
        loading={isPending}
        historicalMonthly={totals.monthly}
        metric="emissions"
        color="#0D3585"
        unit="kg CO₂e"
      />

      <Paper withBorder radius="md" style={{ overflow: 'auto' }}>
        {emissions.length < totals.records && (
          <Text size="xs" c="dimmed" px="md" pt="sm">
            {t('latestRecords', { count: emissions.length, total: totals.records })}
          </Text>
        )}
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('emissionsTab.date')}</Table.Th>
              <Table.Th>CO₂e</Table.Th>
              <Table.Th>{t('emissionsTab.scope')}</Table.Th>
              <Table.Th>{t('emissionsTab.state')}</Table.Th>
              <Table.Th>{t('emissionsTab.emissionFactor')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {emissions.slice(0, 50).map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {new Date(r.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={600}>{r.co2eKg.toLocaleString()} kg</Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="xs" style={{ background: SCOPE_COLOR[r.scope] ?? '#aaa', color: '#fff' }}>
                    {r.scope.replace('_', ' ')}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge size="xs" color={STATUS_COLOR[r.verificationStatus] ?? 'gray'} variant="light">
                    {t(`status.${r.verificationStatus}`)}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {r.emissionFactor != null ? `${r.emissionFactor} kgCO₂/kWh` : '—'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
