'use client';

import { Paper, Text, Group, SegmentedControl } from '@mantine/core';
import { useTranslations, useLocale } from 'next-intl';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyPoint } from '@/domain/energy/EnergyTypes';
import type { EnergyForecast, ForecastHorizon } from '@/lib/projections/energy-forecast';
import { monthLabel } from './EnergyViews';

const CHART_GRID = 'var(--mantine-color-default-border)';
const HORIZONS: ForecastHorizon[] = [3, 6, 12];

interface ForecastChartRow {
  label: string;
  historical?: number;
  projected?: number;
  low?: number;
  band?: number;
}

function buildRows(
  historicalMonthly: MonthlyPoint[],
  forecastPoints: EnergyForecast['totalConsumption'],
  locale: string
): ForecastChartRow[] {
  const historicalRows: ForecastChartRow[] = historicalMonthly.map((p) => ({
    label: monthLabel(p.month, locale),
    historical: +p.value.toFixed(2),
  }));
  const projectedRows: ForecastChartRow[] = forecastPoints.map((p) => ({
    label: monthLabel(p.month, locale),
    projected: +p.value.toFixed(2),
    low: +p.low.toFixed(2),
    band: +(p.high - p.low).toFixed(2),
  }));
  return [...historicalRows, ...projectedRows];
}

export function ForecastSection({
  forecast,
  horizon,
  onHorizonChange,
  loading,
  historicalMonthly,
  metric,
  color,
  unit,
}: {
  forecast: EnergyForecast;
  horizon: ForecastHorizon;
  onHorizonChange: (horizon: ForecastHorizon) => void;
  loading: boolean;
  historicalMonthly: MonthlyPoint[];
  metric: 'consumption' | 'emissions';
  color: string;
  unit: string;
}) {
  const t = useTranslations('energyHub.forecast');
  const locale = useLocale();

  const points = metric === 'consumption' ? forecast.totalConsumption : forecast.totalEmissions;
  const totalSources = forecast.sources.length;
  const rows = buildRows(historicalMonthly, points, locale);

  return (
    <Paper withBorder p="md" radius="md" style={{ opacity: loading ? 0.6 : 1 }}>
      <Group justify="space-between" mb="sm" wrap="wrap">
        <Text fw={600}>{t('title')}</Text>
        <SegmentedControl
          size="xs"
          value={String(horizon)}
          onChange={(value) => onHorizonChange(Number(value) as ForecastHorizon)}
          data={HORIZONS.map((h) => ({ value: String(h), label: t('horizonOption', { count: h }) }))}
        />
      </Group>

      {points.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('noHistory')}
        </Text>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => `${value.toLocaleString()} ${unit}`} />
              <Legend
                formatter={(value) => (value === 'historical' ? t('historicalLabel') : value === 'projected' ? t('projectedLabel') : null)}
              />
              <Area type="monotone" dataKey="historical" name="historical" fill={`${color}20`} stroke={color} strokeWidth={2} connectNulls={false} />
              <Area type="monotone" dataKey="low" stackId="band" fill="transparent" stroke="none" legendType="none" isAnimationActive={false} />
              <Area type="monotone" dataKey="band" stackId="band" fill={`${color}15`} stroke="none" legendType="none" isAnimationActive={false} />
              <Line type="monotone" dataKey="projected" name="projected" stroke={color} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
          {forecast.excludedSources > 0 && (
            <Text size="xs" c="dimmed" mt="xs">
              {t('excludedSources', { count: forecast.excludedSources, total: totalSources })}
            </Text>
          )}
        </>
      )}
    </Paper>
  );
}
