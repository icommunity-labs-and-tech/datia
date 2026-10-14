'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Alert,
  Badge,
  Button,
  Center,
  Code,
  CopyButton,
  Group,
  Modal,
  ScrollArea,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  ActionIcon,
  Tooltip as MantineTooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconKey,
  IconChartLine,
  IconTrash,
  IconPlus,
  IconCheck,
  IconCopy,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createApiToken } from '@/actions/api-tokens/create';
import { listApiTokens } from '@/actions/api-tokens/list';
import { deleteApiToken } from '@/actions/api-tokens/delete';
import { getCallsByToken } from '@/actions/api-calls/getCallsByToken';
import SectionCard from '@/components/layout/SectionCard';
import { axisProps, gridProps, tooltipStyle, seriesColor } from '@/components/charts/theme';

interface ApiToken {
  id: string;
  name: string;
  organizationId: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export default function AuthPageClient() {
  const t = useTranslations('developer.auth');
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiCalls, setApiCalls] = useState<Record<string, Array<{ createdAt: Date; statusCode: number }>>>({});
  const [createOpened, setCreateOpened] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenExpiresAt, setNewTokenExpiresAt] = useState<Date | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenToDelete, setTokenToDelete] = useState<ApiToken | null>(null);

  const loadTokens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listApiTokens();
      if (result.success && result.data) {
        setTokens(result.data);
      } else {
        setError(result.error || t('loadError'));
      }
    } catch (err: any) {
      setError(err?.message || t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadApiCalls = useCallback(async () => {
    if (tokens.length === 0) return;

    const now = new Date();
    const oldestToken = tokens.reduce((oldest, token) => {
      const tokenDate = new Date(token.createdAt);
      return tokenDate < oldest ? tokenDate : oldest;
    }, new Date(tokens[0].createdAt));

    const startDate = new Date(oldestToken);
    startDate.setHours(0, 0, 0, 0);

    try {
      const entries = await Promise.all(
        tokens.map(async (token) => {
          const result = await getCallsByToken({ apiTokenId: token.id, startDate, endDate: now });
          const calls = result.success && result.data
            ? result.data.map((call) => ({
                createdAt: new Date(call.createdAt),
                statusCode: call.statusCode,
              }))
            : [];
          return [token.id, calls] as const;
        })
      );
      setApiCalls(Object.fromEntries(entries));
    } catch (err) {
      console.error('Error loading API calls:', err);
    }
  }, [tokens]);

  useEffect(() => { loadTokens(); }, [loadTokens]);

  useEffect(() => {
    if (tokens.length > 0 && !loading) loadApiCalls();
  }, [tokens.length, loading, loadApiCalls]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      let expiresAt: Date | null = null;
      if (newTokenExpiresAt) {
        expiresAt = new Date(newTokenExpiresAt);
        expiresAt.setHours(0, 0, 0, 0);
      }
      const result = await createApiToken(newTokenName, expiresAt);

      if (result.success && result.data) {
        setNewToken(result.data.token);
        setCreateOpened(false);
        setNewTokenName('');
        setNewTokenExpiresAt(null);
        await loadTokens();
      } else {
        setError(result.error || t('createError'));
      }
    } catch {
      setError(t('createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!tokenToDelete) return;
    const id = tokenToDelete.id;
    setTokenToDelete(null);

    try {
      const result = await deleteApiToken(id);
      if (result.success) {
        setSuccess(t('deleteSuccess'));
        await loadTokens();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || t('deleteError'));
      }
    } catch {
      setError(t('deleteError'));
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return t('never');
    const locale = typeof window !== 'undefined' ? navigator.language : 'en-US';
    return new Date(date).toLocaleString(locale);
  };

  const isExpired = (expiresAt: Date | null) =>
    expiresAt ? new Date(expiresAt) < new Date() : false;

  // One line per token, bucketed by week when the range is long.
  const chartData = useMemo(() => {
    if (tokens.length === 0) return { data: [], tokenNames: [] };

    const now = new Date();
    const sortedTokens = [...tokens].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const oldestDate = new Date(sortedTokens[0].createdAt);
    oldestDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));

    const periodType = daysDiff > 30 ? 'week' : 'day';
    const periods: Array<{ period: string; date: Date }> = [];

    const startDate = new Date(oldestDate);
    let periodNum = 1;

    while (startDate <= now) {
      const locale = typeof window !== 'undefined' ? navigator.language : 'en-US';
      const key = periodType === 'week'
        ? `${t('period')} ${periodNum}`
        : startDate.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });

      periods.push({ period: key, date: new Date(startDate) });

      if (periodType === 'week') {
        startDate.setDate(startDate.getDate() + 7);
        periodNum++;
      } else {
        startDate.setDate(startDate.getDate() + 1);
      }
    }

    const result = periods.map(({ period, date }) => {
      const periodData: { period: string; [key: string]: number | string } = { period };
      const endDate = periodType === 'week'
        ? new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000)
        : new Date(date.getTime() + 24 * 60 * 60 * 1000);

      sortedTokens.forEach((token, index) => {
        const tokenKey = `token_${index}`;
        if (new Date(token.createdAt) <= endDate) {
          const calls = apiCalls[token.id] || [];
          periodData[tokenKey] = calls.filter((call) => {
            const callDate = new Date(call.createdAt);
            return callDate >= date && callDate < endDate;
          }).length;
        } else {
          periodData[tokenKey] = 0;
        }
      });

      return periodData;
    });

    const tokenNames = sortedTokens.map((token, index) => ({
      key: `token_${index}`,
      name: token.name,
    }));

    return { data: result, tokenNames };
  }, [tokens, apiCalls, t]);

  const curlExample = `curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/v1/items \\
  -H "Authorization: Bearer ${newToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"id": "ITEM-001", "name": "Turbina T-100", "description": "..."}'`;

  return (
    <Stack gap="md">
      <SectionCard icon={IconKey} title={t('whatAreTokens')}>
        <Text size="sm" c="dimmed">{t('tokensDescription')}</Text>
      </SectionCard>

      <SectionCard
        icon={IconKey}
        title={t('title')}
        actions={
          <Button
            size="xs"
            leftSection={<IconPlus size={14} stroke={1.7} />}
            onClick={() => setCreateOpened(true)}
          >
            {t('createToken')}
          </Button>
        }
      >
        {error && (
          <Alert color="red" variant="light" withCloseButton onClose={() => setError(null)} mb="md">
            {error}
          </Alert>
        )}
        {success && (
          <Alert color="green" variant="light" withCloseButton onClose={() => setSuccess(null)} mb="md">
            {success}
          </Alert>
        )}

        {loading ? (
          <Stack gap="xs">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={38} radius="sm" />
            ))}
          </Stack>
        ) : tokens.length === 0 ? (
          <Center py={48}>
            <Stack align="center" gap="sm">
              <ThemeIcon color="gray" variant="light" size={48} radius="xl">
                <IconKey size={24} stroke={1.5} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">{t('noTokens')}</Text>
            </Stack>
          </Center>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="xs" miw={720}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('table.name')}</Table.Th>
                  <Table.Th>{t('table.created')}</Table.Th>
                  <Table.Th>{t('table.lastUsed')}</Table.Th>
                  <Table.Th>{t('table.expires')}</Table.Th>
                  <Table.Th>{t('table.status')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tokens.map((token) => (
                  <Table.Tr key={token.id}>
                    <Table.Td><Text size="sm" fw={550}>{token.name}</Text></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{formatDate(token.createdAt)}</Text></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{formatDate(token.lastUsedAt)}</Text></Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {token.expiresAt ? formatDate(token.expiresAt) : t('never')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={isExpired(token.expiresAt) ? 'red' : 'green'}
                      >
                        {isExpired(token.expiresAt) ? t('expired') : t('active')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <MantineTooltip label={t('delete')}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          aria-label={t('delete')}
                          onClick={() => setTokenToDelete(token)}
                        >
                          <IconTrash size={15} stroke={1.7} />
                        </ActionIcon>
                      </MantineTooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </SectionCard>

      {!loading && tokens.length > 0 && chartData.data.length > 0 && (
        <SectionCard icon={IconChartLine} title={t('usageEvolution')}>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData.data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="period" {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => {
                  const tokenIndex = parseInt(name.replace('token_', ''));
                  const tokenName = chartData.tokenNames[tokenIndex]?.name || name;
                  const callsText = value !== 1 ? t('callsPlural') : t('calls');
                  return [`${value} ${callsText}`, tokenName];
                }}
                labelFormatter={(label) => `${t('period')} ${label}`}
              />
              <Legend
                formatter={(value) => {
                  const tokenIndex = parseInt(String(value).replace('token_', ''));
                  return chartData.tokenNames[tokenIndex]?.name || value;
                }}
              />
              {chartData.tokenNames.map((token, index) => (
                <Line
                  key={token.key}
                  type="monotone"
                  dataKey={token.key}
                  stroke={seriesColor(index)}
                  strokeWidth={2}
                  name={token.key}
                  dot={{ fill: seriesColor(index), strokeWidth: 2, r: 3 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Create token */}
      <Modal opened={createOpened} onClose={() => setCreateOpened(false)} title={t('createModal.title')}>
        <form onSubmit={handleCreate}>
          <Stack gap="md">
            <TextInput
              label={t('createModal.nameLabel')}
              description={t('createModal.nameHelp')}
              placeholder={t('createModal.namePlaceholder')}
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.currentTarget.value)}
              required
              data-autofocus
            />
            <DateInput
              label={t('createModal.expiresLabel')}
              description={t('createModal.expiresHelp')}
              value={newTokenExpiresAt}
              onChange={(value) => setNewTokenExpiresAt(value as Date | null)}
              clearable
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={() => setCreateOpened(false)}>
                {t('createModal.cancel')}
              </Button>
              <Button type="submit" loading={creating} disabled={!newTokenName.trim()}>
                {t('createModal.create')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Reveal the token exactly once */}
      <Modal
        opened={newToken !== null}
        onClose={() => setNewToken(null)}
        title={t('tokenCreated.title')}
        size="lg"
      >
        <Stack gap="md">
          <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
            <Text size="sm">
              <strong>{t('tokenCreated.important')}</strong> {t('tokenCreated.warning')}
            </Text>
          </Alert>

          <Stack gap={6}>
            <Text size="sm" fw={550}>{t('tokenCreated.tokenLabel')}</Text>
            <Group gap="xs" wrap="nowrap" align="flex-start">
              <Code block style={{ flex: 1, wordBreak: 'break-all' }}>{newToken}</Code>
              <CopyButton value={newToken ?? ''} timeout={2000}>
                {({ copied, copy }) => (
                  <Button
                    variant={copied ? 'light' : 'default'}
                    color={copied ? 'green' : undefined}
                    size="xs"
                    onClick={copy}
                    leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    style={{ flexShrink: 0 }}
                  >
                    {t('tokenCreated.copy')}
                  </Button>
                )}
              </CopyButton>
            </Group>
          </Stack>

          <Stack gap={6}>
            <Text size="sm" fw={550}>{t('tokenCreated.exampleTitle')}</Text>
            <Code block>{curlExample}</Code>
          </Stack>

          <Group justify="flex-end">
            <Button onClick={() => setNewToken(null)}>{t('tokenCreated.understood')}</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete confirmation — replaces the native confirm() dialog */}
      <Modal
        opened={tokenToDelete !== null}
        onClose={() => setTokenToDelete(null)}
        title={t('delete')}
      >
        <Stack gap="md">
          <Text size="sm">{t('deleteConfirm')}</Text>
          {tokenToDelete && <Code>{tokenToDelete.name}</Code>}
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setTokenToDelete(null)}>
              {t('createModal.cancel')}
            </Button>
            <Button color="red" onClick={handleDelete} leftSection={<IconTrash size={15} />}>
              {t('delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
