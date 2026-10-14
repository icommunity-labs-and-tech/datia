'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Badge,
  Center,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconClockHour4 } from '@tabler/icons-react';
import PageHeader from '@/components/layout/PageHeader';
import { listPendingCertifications, type PendingCertification } from '@/actions/certifications/list-pending';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function PendingCertificationsPanel() {
  const t = useTranslations('superadminCertifications');
  const locale = useLocale();
  const [rows, setRows] = useState<PendingCertification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPendingCertifications()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const waitingDays = (createdAt: Date) => Math.floor((Date.now() - new Date(createdAt).getTime()) / DAY_MS);

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />

      <Paper withBorder radius="md" p="md">
        {loading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : rows.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="sm">
              <ThemeIcon color="green" variant="light" size={48} radius="xl">
                <IconClockHour4 size={24} stroke={1.5} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">{t('empty')}</Text>
            </Stack>
          </Center>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="xs" miw={640}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('table.organization')}</Table.Th>
                  <Table.Th>{t('table.company')}</Table.Th>
                  <Table.Th ta="right">{t('table.records')}</Table.Th>
                  <Table.Th>{t('table.waiting')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => {
                  const days = waitingDays(row.createdAt);
                  return (
                    <Table.Tr key={row.id}>
                      <Table.Td><Text size="sm" fw={550}>{row.organizationName}</Text></Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">{row.companyName ?? '—'}</Text></Table.Td>
                      <Table.Td ta="right"><Badge variant="light" color="datiaBlue">{row.recordCount}</Badge></Table.Td>
                      <Table.Td>
                        <Text size="sm" c={days >= 1 ? 'orange' : 'dimmed'}>
                          {t('table.waitingSince', { date: new Date(row.createdAt).toLocaleDateString(locale) })}
                          {days >= 1 && ` · ${t('table.daysWaiting', { count: days })}`}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>
    </>
  );
}
