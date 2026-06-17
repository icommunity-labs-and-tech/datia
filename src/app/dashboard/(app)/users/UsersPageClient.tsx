'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import { useTranslations } from 'next-intl';
import Box from '@/components/Box';
import { Divider } from '@/components/Divider';
import UsersStatsPanel, { type RoleFilter } from '@/components/charts/UsersStatsPanel';
import UsersTable from '@/components/views/UsersTable';
import { getUsers } from '@/actions/users';

export default function UsersPageClient() {
  const t = useTranslations('usersPage.charts');
  const tTables = useTranslations('tables');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

  const load = useCallback(async () => {
    const result = await getUsers();
    if (result.success) setAllUsers(result.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredUsers = useMemo(() =>
    roleFilter === 'ALL' ? allUsers : allUsers.filter(u => u.role === roleFilter),
    [allUsers, roleFilter],
  );

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center mb-4" style={{ height: 180 }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Box>
        <h6 className="mb-2">{tTables('whatIsUserManagement')}</h6>
        <Divider />
        <p className="mb-0 text-muted">{tTables('usersDescription')}</p>
      </Box>

      <UsersStatsPanel
        allUsers={allUsers}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
      />

      <UsersTable
        showBox={true}
        showDescription={false}
        externalData={filteredUsers}
        onDataChange={load}
      />
    </>
  );
}
