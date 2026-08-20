/**
 * Chart tokens aligned with the Mantine theme in src/lib/mantine-theme.ts:
 * brand accents for data, cool neutrals for the frame.
 */

export const colors = {
  blue: '#1752CC',
  sky: '#5090DE',
  green: '#22c55e',
  amber: '#F0930A',
  amberLight: '#FBD18A',
  grayTick: '#8E97A8',
  grid: '#E7EAF0',
};

/**
 * Categorical palette for multi-series charts — ordered so the first few stay
 * distinguishable, and colour-blind safe in that range.
 */
export const series = [
  '#1752CC', // brand blue
  '#F0930A', // amber
  '#0E9F6E', // green
  '#7C3AED', // violet
  '#0891B2', // teal
  '#DC2626', // red
  '#5090DE', // light blue
  '#B45309', // brown
] as const;

/** Stable colour for a series index, wrapping around the palette. */
export const seriesColor = (index: number) => series[index % series.length];

export const axisProps = {
  stroke: colors.grid,
  tick: { fill: colors.grayTick, fontSize: 12 },
  tickLine: false,
} as const;

export const gridProps = {
  strokeDasharray: '3 3',
  stroke: colors.grid,
  vertical: false,
} as const;

export const tooltipStyle = {
  background: '#FFFFFF',
  border: '1px solid #E7EAF0',
  borderRadius: 10,
  boxShadow: '0 4px 12px rgba(29, 35, 48, 0.07)',
  fontSize: 13,
} as const;
