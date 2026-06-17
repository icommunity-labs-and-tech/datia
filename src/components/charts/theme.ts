export const colors = {
  blue: '#0d6efd',
  sky: '#60a5fa',
  green: '#22c55e',
  amber: '#f59e0b',
  amberLight: '#fde68a',
  grayTick: '#64748b',
  grid: 'rgba(13,110,253,0.08)',
};

export const axisProps = { stroke: colors.grayTick, tick: { fill: colors.grayTick } } as const;

export const gridProps = { strokeDasharray: '3 3', stroke: colors.grid } as const;

export const tooltipStyle = {
  background: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(13,110,253,0.2)',
  borderRadius: 8,
} as const;


