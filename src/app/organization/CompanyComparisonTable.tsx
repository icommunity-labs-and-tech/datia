'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Anchor, Badge, Group, Paper, Progress, Stack, Table, Text } from '@mantine/core';
import type { CompanyComparisonRow } from '@/actions/organizations/get-company-comparison';

/**
 * One row per company: the comparison a company's own Inicio has no reason to
 * show, since it has no other companies to compare itself with (#20). A bar
 * reads faster than a bare percentage for "which one needs attention."
 */
export default function CompanyComparisonTable({ rows }: { rows: CompanyComparisonRow[] }) {
  const t = useTranslations('organizationOverview.comparison');
  const locale = useLocale();

  if (rows.length === 0) return null;

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap={2} mb="sm">
        <Text fw={600} size="sm">{t('title')}</Text>
        <Text size="xs" c="dimmed">{t('subtitle')}</Text>
      </Stack>

      <Table verticalSpacing="xs" horizontalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('table.company')}</Table.Th>
            <Table.Th ta="right">{t('table.assets')}</Table.Th>
            <Table.Th>{t('table.coverage')}</Table.Th>
            <Table.Th>{t('table.lastActivity')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={row.id}>
              <Table.Td>
                <Group gap={8} wrap="nowrap">
                  <Anchor component={Link} href={`/organization/companies/${row.id}`} size="sm" fw={550}>
                    {row.name}
                  </Anchor>
                  {!row.active && (
                    <Badge size="xs" variant="light" color="gray">{t('inactive')}</Badge>
                  )}
                </Group>
              </Table.Td>
              <Table.Td ta="right">
                <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{row.assets}</Text>
              </Table.Td>
              <Table.Td>
                {row.coverage == null ? (
                  <Text size="xs" c="dimmed">{t('noCertifications')}</Text>
                ) : (
                  <Group gap={8} wrap="nowrap" miw={140}>
                    <Progress value={row.coverage} color={row.coverage >= 80 ? 'green' : row.coverage >= 40 ? 'yellow' : 'orange'} size="sm" radius="sm" style={{ flex: 1 }} />
                    <Text size="xs" c="dimmed" style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {row.coverage}%
                    </Text>
                  </Group>
                )}
              </Table.Td>
              <Table.Td>
                <Text size="xs" c="dimmed">
                  {row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleDateString(locale) : t('noActivity')}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
