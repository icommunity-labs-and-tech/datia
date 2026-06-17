'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useTranslations } from 'next-intl';
import { withDashboardChart } from './withDashboardChart';
import { colors, tooltipStyle } from './theme';
import type { CategoryDistribution } from '@/types/dashboard';

const MAX_SLICES = 6;

const colorPalette = [
  colors.blue, colors.green, colors.amber, colors.sky,
  '#8b5cf6', '#f97316',
];
const OTHERS_COLOR = '#94a3b8';

function InnerCategoryDistributionChart({ data, othersLabel }: { data: CategoryDistribution[]; othersLabel: string }) {
  const t = useTranslations('dashboard.charts.categoryDistribution');

  // Sort descending by count and collapse tail into "Otros"
  const sorted = [...data].sort((a, b) => b.itemCount - a.itemCount);
  const top = sorted.slice(0, MAX_SLICES);
  const rest = sorted.slice(MAX_SLICES);
  const otherCount = rest.reduce((s, r) => s + r.itemCount, 0);

  const total = data.reduce((s, d) => s + d.itemCount, 0);

  const chartData = [
    ...top.map((item, i) => ({
      ...item,
      name: item.category,
      value: item.itemCount,
      color: colorPalette[i],
      percentage: total > 0 ? (item.itemCount / total) * 100 : 0,
    })),
    ...(otherCount > 0
      ? [{ category: othersLabel, name: othersLabel, value: otherCount, itemCount: otherCount, color: OTHERS_COLOR, percentage: total > 0 ? (otherCount / total) * 100 : 0 }]
      : []),
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0];
      return (
        <div style={tooltipStyle}>
          <p className="mb-1"><strong>{d.name}</strong></p>
          <p style={{ color: d.payload.color }}>{t('items')} {d.value}</p>
          <p style={{ color: d.payload.color }}>{t('percentage')} {d.payload.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => (
    <div className="d-flex flex-wrap justify-content-center gap-3 mt-3">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="d-flex align-items-center">
          <div style={{ width: 12, height: 12, backgroundColor: entry.payload.color, marginRight: 8, borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem' }}>{entry.payload.category}</span>
        </div>
      ))}
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={460}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="42%"
          labelLine={false}
          label={false}
          outerRadius="58%"
          fill="#8884d8"
          dataKey="value"
          paddingAngle={2}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function CategoryDistributionChartWrapper({ data }: { data: CategoryDistribution[] }) {
  const t = useTranslations('dashboard.charts.categoryDistribution');
  const WrappedChart = withDashboardChart(
    (props: { data: CategoryDistribution[] }) => (
      <InnerCategoryDistributionChart data={props.data} othersLabel={t('others')} />
    ),
    t('emptyMessage'),
    'bi-pie-chart'
  );
  return <WrappedChart data={data || []} loading={false} error={null} />;
}

interface CategoryDistributionChartProps {
  data: CategoryDistribution[];
}

export default function CategoryDistributionChart({ data }: CategoryDistributionChartProps) {
  return <CategoryDistributionChartWrapper data={data} />;
}
