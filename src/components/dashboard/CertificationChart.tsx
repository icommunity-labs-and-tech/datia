'use client';

import { useMemo } from 'react';
import { Group, Paper, Stack, Text } from '@mantine/core';
import { useLocale, useTranslations } from 'next-intl';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CertificationTrendPoint } from '@/lib/dashboard/certificationTrend';

const BLUE = '#1752CC';
const AMBER = '#F0930A';
const GRID = 'var(--mantine-color-default-border)';

/** Renders a `YYYY-MM` key in the reader's locale. */
function monthLabel(month: string, locale: string) {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString(locale, { month: 'short', year: '2-digit' });
}

/**
 * Energy and carbon, month by month.
 *
 * This replaces a row of six standalone figures. A number on its own — «309
 * assets» — answers no question: it does not say whether that is good, whether
 * it is rising, or what to do about it. A series does, and it is what an
 * organisation reporting under ESPR is actually asked about.
 *
 * Energy is drawn as bars and carbon as a line on its own axis: they share a
 * shape but not a magnitude, and forcing both onto one scale would flatten
 * whichever is smaller into the floor.
 */
export default function CertificationChart({
  data,
  height = 300,
}: {
  data: CertificationTrendPoint[];
  height?: number;
}) {
  const t = useTranslations('dashboard');
  const locale = useLocale();

  const series = useMemo(
    () =>
      data.map((p) => ({
        label: monthLabel(p.month, locale),
        kWh: p.kwh,
        co2e: p.co2eKg,
      })),
    [data, locale]
  );

  if (!series.length) {
    return (
      <Paper withBorder p="xl" radius="md">
        <Text c="dimmed" ta="center">{t('chart.noData')}</Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap={4} mb="sm">
        <Text fw={600}>{t('chart.title')}</Text>
        <Text size="xs" c="dimmed">{t('chart.subtitle')}</Text>
      </Stack>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="kwhFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BLUE} stopOpacity={0.22} />
              <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="kwh" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="co2"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) =>
              name === 'kWh'
                ? [`${value.toLocaleString(locale)} kWh`, t('chart.energy')]
                : [`${value.toLocaleString(locale)} kg`, t('chart.emissions')]
            }
          />
          <Legend
            formatter={(value) => (value === 'kWh' ? t('chart.energy') : t('chart.emissions'))}
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
          {/* Shares its key with the bars, so it stays out of the legend to
              avoid listing the same series twice. */}
          <Area
            yAxisId="kwh"
            type="monotone"
            dataKey="kWh"
            fill="url(#kwhFill)"
            stroke="none"
            legendType="none"
            isAnimationActive
          />
          <Bar yAxisId="kwh" dataKey="kWh" fill={BLUE} radius={[3, 3, 0, 0]} maxBarSize={30} />
          <Line
            yAxisId="co2"
            type="monotone"
            dataKey="co2e"
            stroke={AMBER}
            strokeWidth={2.5}
            dot={{ r: 3, fill: AMBER }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Paper>
  );
}

/** A figure with the ground it stands on: what it is, and where it is heading. */
export function TrendStat({
  label,
  value,
  unit,
  change,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  change?: number | null;
  hint?: string;
}) {
  const t = useTranslations('dashboard');
  const rising = (change ?? 0) > 0;

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap={6}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts={0.4}>{label}</Text>
        <Group gap={6} align="baseline" wrap="nowrap">
          <Text fw={700} fz={28} lh={1}>{value}</Text>
          {unit && <Text size="sm" c="dimmed">{unit}</Text>}
        </Group>
        {change != null && (
          <Text size="xs" c={rising ? 'orange.7' : 'green.7'} fw={600}>
            {rising ? '▲' : '▼'} {Math.abs(change)}% {t('stat.vsPrevious')}
          </Text>
        )}
        {hint && <Text size="xs" c="dimmed">{hint}</Text>}
      </Stack>
    </Paper>
  );
}
