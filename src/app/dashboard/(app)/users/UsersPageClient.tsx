'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Center, Loader, Stack, Text } from '@mantine/core';
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
      <Center h={180} mb="md">
        <Stack align="center" gap="xs">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">{t('loading')}</Text>
        </Stack>
      </Center>
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
