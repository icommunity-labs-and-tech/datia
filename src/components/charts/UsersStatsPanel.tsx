'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import StatsPanel, { type StatCard, type PieEntry } from './StatsPanel';

export type RoleFilter = 'ALL' | 'ADMIN';

const ROLE_COLORS: Record<'ADMIN', string> = {
  ADMIN: '#0d6efd',
};

interface Props {
  allUsers: any[];
  roleFilter: RoleFilter;
  onRoleFilterChange: (role: RoleFilter) => void;
}

export default function UsersStatsPanel({ allUsers, roleFilter, onRoleFilterChange }: Props) {
  const t = useTranslations('usersPage.charts');

  const admins = useMemo(() => allUsers.filter(u => u.role === 'ADMIN').length, [allUsers]);

  const newThisMonth = useMemo(() => {
    const now = new Date();
    return allUsers.filter(u => {
      const d = new Date(u.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [allUsers]);

  const statCards: StatCard[] = [
    { color: '#0d6efd', value: allUsers.length, label: t('total'), active: roleFilter === 'ALL', onClick: () => onRoleFilterChange('ALL') },
    { color: ROLE_COLORS.ADMIN, value: admins, label: t('admins'), active: roleFilter === 'ADMIN', onClick: () => onRoleFilterChange(roleFilter === 'ADMIN' ? 'ALL' : 'ADMIN') },
    { color: '#8b5cf6', value: newThisMonth, label: t('newThisMonth'), active: false },
  ];

  const pieData: PieEntry[] = useMemo(() => ([
    { key: 'ADMIN', value: admins, name: t('roleAdmin'), color: ROLE_COLORS.ADMIN },
  ] as const).filter(d => d.value > 0), [admins, t]);

  if (allUsers.length === 0) return null;

  return (
    <StatsPanel
      title={t('statsTitle')}
      statCards={statCards}
      pie={{
        title: t('roleDistribution'),
        data: pieData,
        selectedKey: roleFilter === 'ALL' ? null : roleFilter,
        onSelect: (key) => onRoleFilterChange((key as RoleFilter | null) ?? 'ALL'),
        clearLabel: t('roleAll'),
      }}
    />
  );
}
