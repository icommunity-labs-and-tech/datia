'use client';

import { Group, Paper, Progress, Stack, Text } from '@mantine/core';
import { useLocale, useTranslations } from 'next-intl';
import type { ScopeSlice } from '@/actions/dashboard/getCertificationTrend';

/**
 * Where the carbon comes from, under the GHG Protocol.
 *
 * Bars rather than a pie: the question is how one scope compares with another,
 * and a length is far easier to compare than an angle. It also degrades well
 * when an organisation only reports one scope, where a pie would be a circle.
 */
const SCOPE_COLOR: Record<string, string> = {
  SCOPE_1: '#1752CC',
  SCOPE_2: '#40c057',
  SCOPE_3: '#7950f2',
};

export default function ScopeBreakdown({
  slices,
  period,
}: {
  slices: ScopeSlice[];
  /** Same window as the chart beside it, stated so neither is misread. */
  period?: string;
}) {
  const t = useTranslations('dashboard');
  const locale = useLocale();

  const total = slices.reduce((sum, s) => sum + s.co2eKg, 0);
  if (!total) return null;

  return (
    <Paper withBorder p="md" radius="md" h="100%">
      <Stack gap={4} mb="md">
        <Text fw={600}>{t('scope.title')}</Text>
        <Text size="xs" c="dimmed">
          {period ? t('scope.subtitleWithPeriod', { period }) : t('scope.subtitle')}
        </Text>
      </Stack>

      <Stack gap="md">
        {slices.map((slice) => {
          const share = (slice.co2eKg / total) * 100;
          return (
            <Stack key={slice.scope} gap={6}>
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text size="sm" fw={550} lineClamp={1}>
                  {t(`scope.${slice.scope}` as never)}
                </Text>
                <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
                  {share.toFixed(0)}%
                </Text>
              </Group>
              <Progress
                value={share}
                color={SCOPE_COLOR[slice.scope] ?? 'gray'}
                size="md"
                radius="sm"
              />
              <Text size="xs" c="dimmed">
                {(slice.co2eKg / 1000).toLocaleString(locale, { maximumFractionDigits: 2 })} t CO₂e ·{' '}
                {slice.records.toLocaleString(locale)}
              </Text>
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
}
