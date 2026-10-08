'use client';

import { Fragment } from 'react';
import { Box, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { useLocale } from 'next-intl';
import type { Heatmap } from '@/lib/energy/heatmap';

function monthLabel(month: string, locale: string) {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString(locale, { month: 'short' });
}

/**
 * A row-by-month grid, colored by value: which row is heaviest, and when —
 * faster to read at a glance than a line per row would be once there are more
 * than two or three of them.
 */
export default function EnergyHeatmap({
  data,
  title,
  subtitle,
  color,
  unit,
  formatValue = (v: number) => v.toLocaleString(),
}: {
  data: Heatmap;
  title: string;
  subtitle?: string;
  /** Base color of the scale; cells interpolate from it toward the page background. */
  color: string;
  unit: string;
  formatValue?: (value: number) => string;
}) {
  const locale = useLocale();

  if (data.rows.length === 0) return null;

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap={2} mb="sm">
        <Text fw={600} size="sm">{title}</Text>
        {subtitle && <Text size="xs" c="dimmed">{subtitle}</Text>}
      </Stack>

      <Box style={{ overflowX: 'auto' }}>
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: `minmax(110px, auto) repeat(${data.months.length}, 34px)`,
            gap: 3,
            alignItems: 'center',
            minWidth: 'fit-content',
          }}
        >
          <Box />
          {data.months.map((m) => (
            <Text key={m} size="9px" c="dimmed" ta="center" tt="uppercase">
              {monthLabel(m, locale)}
            </Text>
          ))}

          {data.rows.map((row) => (
            <Fragment key={row.label}>
              <Text size="xs" fw={500} truncate>{row.label}</Text>
              {row.values.map((v, i) => {
                const ratio = v != null && data.max > 0 ? v / data.max : 0;
                return (
                  <Tooltip
                    key={`${row.label}-${data.months[i]}`}
                    label={v != null ? `${formatValue(v)} ${unit}` : '—'}
                    disabled={v == null}
                    withinPortal
                  >
                    <Box
                      style={{
                        height: 22,
                        borderRadius: 4,
                        background:
                          v != null
                            ? `color-mix(in srgb, ${color} ${Math.round(12 + ratio * 88)}%, var(--mantine-color-body))`
                            : 'var(--mantine-color-default-hover)',
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Fragment>
          ))}
        </Box>
      </Box>
    </Paper>
  );
}
