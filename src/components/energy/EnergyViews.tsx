'use client';

/**
 * The three energy views. Each one is a route of its own
 * (/dashboard/energy/{sources,consumption,emissions}) so a visit only loads
 * the data that view needs.
 */

import { useState } from 'react';
import {
  Grid,
  Paper,
  Text,
  Badge,
  Group,
  Stack,
  ThemeIcon,
  Progress,
  Table,
  Alert,
  Drawer,
  Title,
  Divider,
  SimpleGrid,
  ActionIcon,
  Tooltip as MantineTooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconMap,
  IconBolt,
  IconCloudFog,
  IconInfoCircle,
  IconExternalLink,
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
import EnergySourcesGlobalMapLazy from '@/components/maps/EnergySourcesGlobalMapLazy';
import { CARRIER_COLORS } from '@/lib/energy/carrierColors';
import BmsSimulatorButton from '@/components/energy/BmsSimulatorButton';

/** Renders a YYYY-MM key in the reader's locale. */
function monthLabel(month: string, locale: string) {
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

function SourceDrawer({
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

// ── Tab: Sources Map ─────────────────────────────────────────────────────────

export function EnergySourcesMap({
  sources,
  consumption,
}: {
  sources: EnergySourceRecord[];
  consumption: EnergyConsumptionRecord[];
}) {
  const t = useTranslations('energyHub');
  const [selectedSource, setSelectedSource] = useState<EnergySourceRecord | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

  const handleClick = (source: EnergySourceRecord) => {
    setSelectedSource(source);
    openDrawer();
  };

  const hasMapped = sources.some((s) => s.latitude != null && s.longitude != null);

  const totalCapacity = sources.reduce((s, r) => s + (r.capacityKw ?? 0), 0);
  const withRenewable = sources.filter((r) => r.renewableShare != null);
  const avgRenewable =
    withRenewable.length > 0
      ? withRenewable.reduce((s, r) => s + r.renewableShare!, 0) / withRenewable.length
      : null;

  return (
    <>
      <SourceDrawer
        source={selectedSource}
        opened={drawerOpened}
        onClose={closeDrawer}
        consumption={consumption}
      />

      <Group justify="flex-end" mb="sm">
        <BmsSimulatorButton />
      </Group>

      {/* KPI strip */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="md">
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>{t('mapTab.sources')}</Text>
          <Text fw={700} fz="xl">{sources.length}</Text>
        </Paper>
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>{t('mapTab.capacity')}</Text>
          <Text fw={700} fz="xl">{totalCapacity >= 1000 ? `${(totalCapacity / 1000).toFixed(1)} MW` : `${totalCapacity.toFixed(0)} kW`}</Text>
        </Paper>
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>{t('mapTab.renewableShare')}</Text>
          <Text fw={700} fz="xl">{avgRenewable != null ? `${avgRenewable.toFixed(0)}%` : '—'}</Text>
        </Paper>
        <Paper withBorder p="sm" radius="md">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>{t('mapTab.withGo')}</Text>
          <Text fw={700} fz="xl">{sources.filter((s) => s.guaranteeOfOriginId).length}</Text>
        </Paper>
      </SimpleGrid>

      <Grid gutter="md">
        {/* Map */}
        <Grid.Col span={{ base: 12, md: 9 }}>
          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            {!hasMapped ? (
              <Alert icon={<IconInfoCircle size={16} />} color="datiaBlue" m="md">
                {t('mapTab.noCoordinates')}
              </Alert>
            ) : (
              <EnergySourcesGlobalMapLazy
                sources={sources}
                height={480}
                onSourceClick={handleClick}
              />
            )}
          </Paper>
        </Grid.Col>

        {/* Sources list */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Stack gap="xs">
            {sources.map((source) => (
              <Paper
                key={source.id}
                withBorder
                p="sm"
                radius="md"
                style={{ cursor: 'pointer' }}
                onClick={() => handleClick(source)}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text fw={600} size="sm" truncate>{source.name}</Text>
                    <Group gap={4}>
                      <Badge
                        size="xs"
                        style={{ background: CARRIER_COLORS[source.energyCarrier], color: '#fff' }}
                      >
                        {t(`carriers.${source.energyCarrier}`)}
                      </Badge>
                      {source.latitude != null && (
                        <Badge size="xs" color="teal" variant="dot">{t('mapTab.onMap')}</Badge>
                      )}
                    </Group>
                  </Stack>
                  <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                    {source.capacityKw != null && (
                      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                        {source.capacityKw} kW
                      </Text>
                    )}
                    {/* The public report is where a customer sees this source's
                        certification — reachable from the asset it belongs to. */}
                    <MantineTooltip label={t('mapTab.publicReport')}>
                      <ActionIcon
                        component="a"
                        href={`/customer/item/${encodeURIComponent(source.itemId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="subtle"
                        color="gray"
                        size="sm"
                        aria-label={t('mapTab.publicReport')}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <IconExternalLink size={14} stroke={1.7} />
                      </ActionIcon>
                    </MantineTooltip>
                  </Group>
                </Group>
                {source.renewableShare != null && (
                  <Progress value={source.renewableShare} size={4} color="green" mt={6} radius="xl" />
                )}
              </Paper>
            ))}
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}

// ── Tab: Consumption ─────────────────────────────────────────────────────────

export function EnergyConsumption({
  consumption,
  sources,
  totals,
}: {
  consumption: EnergyConsumptionRecord[];
  sources: EnergySourceRecord[];
  totals: EnergyConsumptionTotals;
}) {
  const t = useTranslations('energyHub');
  const locale = useLocale();
  const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]));

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
}: {
  emissions: EmissionRecord[];
  totals: EmissionTotals;
}) {
  const t = useTranslations('energyHub');
  const locale = useLocale();

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
