'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useBackupStatus } from '@/hooks/useDashboardData';
import { withDashboardChart } from './withDashboardChart';
import { colors, axisProps, gridProps, tooltipStyle } from './theme';

function InnerBackupStatusChart({ data }: { data: any[] }) {
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
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="user" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="backedStates" fill={colors.green} name="Estados Respaldados" stackId="a" />
        <Bar dataKey="pendingStates" fill={colors.amber} name="Estados Pendientes" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}

const WrappedBackupChart = withDashboardChart(
  InnerBackupStatusChart,
  'No hay datos de respaldo disponibles',
  'bi-shield-check'
);

export default function BackupStatusChart() {
  const { data, loading, error } = useBackupStatus();
  return (
    <WrappedBackupChart data={data || []} loading={loading} error={error} />
  );
}
