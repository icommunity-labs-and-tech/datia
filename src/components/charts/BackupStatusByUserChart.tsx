'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';
import { withDashboardChart } from './withDashboardChart';
import { DASHBOARD_THEME } from '@/config/dashboardConfig';
import type { BackupStatusByUser } from '@/types/dashboard';

interface InnerBackupStatusByUserChartProps {
  data: BackupStatusByUser[];
}

const InnerBackupStatusByUserChart: React.FC<InnerBackupStatusByUserChartProps> = ({ data }) => {
  const t = useTranslations('dashboard.charts.backupStatusByUser');
  const colors = DASHBOARD_THEME.colors;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis 
          dataKey="user" 
          stroke={colors.grayTick}
          fontSize={12}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis stroke={colors.grayTick} fontSize={12} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
          formatter={(value: number, name: string) => [
            value, 
            name === 'totalStates' ? t('totalStates') : 
            name === 'backedStates' ? t('backedStates') : t('pendingStates')
          ]}
        />
        <Legend 
          formatter={(value: string) => 
            value === 'totalStates' ? t('totalStates') : 
            value === 'backedStates' ? t('backedStates') : t('pendingStates')
          }
        />
        <Bar 
          dataKey="totalStates" 
          fill={colors.blue} 
          name="totalStates"
          radius={[4, 4, 0, 0]}
        />
        <Bar 
          dataKey="backedStates" 
          fill={colors.green} 
          name="backedStates"
          radius={[4, 4, 0, 0]}
        />
        <Bar 
          dataKey="pendingStates" 
          fill={colors.amber} 
          name="pendingStates"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Wrapper component that provides translations
function BackupStatusByUserChartWrapper({ data }: { data: BackupStatusByUser[] }) {
  const t = useTranslations('dashboard.charts.backupStatusByUser');
  const WrappedChart = withDashboardChart(
    InnerBackupStatusByUserChart,
    t('emptyMessage'),
    '📊'
  );
  return <WrappedChart data={data || []} loading={false} error={null} />;
}

interface BackupStatusByUserChartProps {
  data: BackupStatusByUser[];
}

export const BackupStatusByUserChart: React.FC<BackupStatusByUserChartProps> = ({ data }) => {
  return <BackupStatusByUserChartWrapper data={data} />;
};
