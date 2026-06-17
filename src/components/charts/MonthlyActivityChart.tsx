'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';
import { withDashboardChart } from './withDashboardChart';
import { colors, axisProps, gridProps, tooltipStyle } from './theme';
import type { MonthlyActivity } from '@/types/dashboard';

function InnerMonthlyActivityChart({ data }: { data: MonthlyActivity[] }) {
  const t = useTranslations('dashboard.charts.monthlyActivity');
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={tooltipStyle}>
          <p className="mb-1"><strong>{label}</strong></p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="usersRegistered" 
          stroke={colors.blue} 
          strokeWidth={2}
          name={t('usersRegistered')}
          dot={{ fill: colors.blue, strokeWidth: 2, r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="itemsCreated" 
          stroke={colors.green} 
          strokeWidth={2}
          name={t('itemsCreated')}
          dot={{ fill: colors.green, strokeWidth: 2, r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const WrappedMonthlyChart = withDashboardChart(
  InnerMonthlyActivityChart,
  'No hay datos de actividad disponibles',
  'bi-graph-up'
);

interface MonthlyActivityChartProps {
  data: MonthlyActivity[];
}

export default function MonthlyActivityChart({ data }: MonthlyActivityChartProps) {
  return <WrappedMonthlyChart data={data} />;
}
