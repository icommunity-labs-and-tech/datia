'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Center,
  Checkbox,
  Code,
  Group,
  Modal,
  ScrollArea,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip as MantineTooltip,
} from '@mantine/core';
import {
  IconWebhook,
  IconChartLine,
  IconPencil,
  IconTrash,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { listWebhooks } from '@/actions/webhooks/list';
import { createWebhook } from '@/actions/webhooks/create';
import { updateWebhook } from '@/actions/webhooks/update';
import { deleteWebhook } from '@/actions/webhooks/delete';
import { toggleWebhookActive } from '@/actions/webhooks/toggleActive';
import SectionCard from '@/components/layout/SectionCard';
import { axisProps, gridProps, tooltipStyle, seriesColor } from '@/components/charts/theme';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  headers: Record<string, string> | null;
  lastTriggeredAt: Date | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  failureCount: number;
  createdAt: Date;
}

interface FormState {
  name: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  headers: string;
}

const AVAILABLE_EVENTS = [
  'asset.created',
  'energy_source_event',
  'energy_consumption_event',
  'co2_emission_event',
  'co2_certification_event',
];

const EMPTY_FORM: FormState = {
  name: '',
  url: '',
  secret: '',
  events: [],
  active: true,
  headers: '',
};

interface WebhookFormProps {
  /** 'createModal' or 'editModal' — both forms share every field. */
  namespace: 'createModal' | 'editModal';
  value: FormState;
  onChange: (value: FormState) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  submitting?: boolean;
}

function WebhookForm({
  namespace,
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  submitting,
}: WebhookFormProps) {
  const t = useTranslations('developer.webhooks');
  const field = (key: string) => t(`${namespace}.${key}` as never);
  const set = <K extends keyof FormState>(key: K, next: FormState[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <form onSubmit={onSubmit}>
      <Stack gap="md">
        <TextInput
          label={field('nameLabel')}
          placeholder={namespace === 'createModal' ? field('namePlaceholder') : undefined}
          value={value.name}
          onChange={(e) => set('name', e.currentTarget.value)}
          required
          data-autofocus
        />

        <TextInput
          type="url"
          label={field('urlLabel')}
          placeholder={namespace === 'createModal' ? field('urlPlaceholder') : undefined}
          description={namespace === 'createModal' ? field('urlHelp') : undefined}
          value={value.url}
          onChange={(e) => set('url', e.currentTarget.value)}
          required
        />

        <Checkbox.Group
          label={field('eventsLabel')}
          description={namespace === 'createModal' ? field('eventsHelp') : undefined}
          value={value.events}
          onChange={(events) => set('events', events)}
        >
          <Stack gap={6} mt={6}>
            {AVAILABLE_EVENTS.map((event) => (
              <Checkbox key={event} value={event} label={<Code>{event}</Code>} size="sm" />
            ))}
          </Stack>
        </Checkbox.Group>

        <TextInput
          label={field('secretLabel')}
          placeholder={field('secretPlaceholder')}
          description={field('secretHelp')}
          value={value.secret}
          onChange={(e) => set('secret', e.currentTarget.value)}
        />

        <Textarea
          label={field('headersLabel')}
          placeholder={namespace === 'createModal' ? field('headersPlaceholder') : undefined}
          description={namespace === 'createModal' ? field('headersHelp') : undefined}
          rows={3}
          autosize
          minRows={3}
          value={value.headers}
          onChange={(e) => set('headers', e.currentTarget.value)}
          styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 13 } }}
        />

        <Switch
          label={field('activeLabel')}
          checked={value.active}
          onChange={(e) => set('active', e.currentTarget.checked)}
        />

        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={onCancel}>{field('cancel')}</Button>
          <Button type="submit" loading={submitting}>{submitLabel}</Button>
        </Group>
      </Stack>
    </form>
  );
}

export default function WebhooksPageClient() {
  const t = useTranslations('developer.webhooks');
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpened, setCreateOpened] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listWebhooks();
      if (result.success && result.data) {
        setWebhooks(result.data);
      } else {
        setError(result.error || t('loadError'));
      }
    } catch (err: any) {
      setError(err?.message || t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadWebhooks(); }, [loadWebhooks]);

  const flashSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  /** Headers are entered as JSON; reject malformed input before submitting. */
  const parseHeaders = (): Record<string, string> | null | undefined => {
    if (!formData.headers.trim()) return null;
    try {
      return JSON.parse(formData.headers);
    } catch {
      setError(t('headersInvalid'));
      return undefined;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const headersObj = parseHeaders();
    if (headersObj === undefined) return;

    try {
      const result = await createWebhook({
        name: formData.name,
        url: formData.url,
        secret: formData.secret || null,
        events: formData.events,
        active: formData.active,
        headers: headersObj,
      });

      if (result.success) {
        setCreateOpened(false);
        setFormData(EMPTY_FORM);
        await loadWebhooks();
        flashSuccess(t('createSuccess'));
      } else {
        setError(result.error || t('createError'));
      }
    } catch {
      setError(t('createError'));
    }
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      secret: '',
      events: webhook.events,
      active: webhook.active,
      headers: webhook.headers ? JSON.stringify(webhook.headers, null, 2) : '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWebhook) return;

    setError(null);
    setSuccess(null);

    const headersObj = parseHeaders();
    if (headersObj === undefined) return;

    try {
      const result = await updateWebhook(editingWebhook.id, {
        name: formData.name,
        url: formData.url,
        secret: formData.secret || null,
        events: formData.events,
        active: formData.active,
        headers: headersObj,
      });

      if (result.success) {
        setEditingWebhook(null);
        setFormData(EMPTY_FORM);
        await loadWebhooks();
        flashSuccess(t('updateSuccess'));
      } else {
        setError(result.error || t('updateError'));
      }
    } catch {
      setError(t('updateError'));
    }
  };

  const handleDelete = async () => {
    if (!webhookToDelete) return;
    const id = webhookToDelete.id;
    setWebhookToDelete(null);

    try {
      const result = await deleteWebhook(id);
      if (result.success) {
        await loadWebhooks();
        flashSuccess(t('deleteSuccess'));
      } else {
        setError(result.error || t('deleteError'));
      }
    } catch {
      setError(t('deleteError'));
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const result = await toggleWebhookActive(id, !currentActive);
      if (result.success) {
        const status = !currentActive ? t('activated') : t('deactivated');
        await loadWebhooks();
        flashSuccess(t('toggleSuccess', { status }));
      } else {
        setError(result.error || t('toggleError'));
      }
    } catch {
      setError(t('toggleError'));
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return t('never');
    const locale = typeof window !== 'undefined' ? navigator.language : 'en-US';
    return new Date(date).toLocaleString(locale);
  };

  // Whether each webhook fired in each period — a 0/1 line per webhook.
  const chartData = useMemo(() => {
    if (webhooks.length === 0) return { data: [], webhookNames: [] };

    const now = new Date();
    const sortedWebhooks = [...webhooks].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const oldestDate = new Date(sortedWebhooks[0].createdAt);
    oldestDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));

    const periodType = daysDiff > 30 ? 'week' : 'day';
    const periods: Array<{ period: string; date: Date; endDate: Date }> = [];

    const startDate = new Date(oldestDate);
    let periodNum = 1;

    while (startDate <= now) {
      const locale = typeof window !== 'undefined' ? navigator.language : 'en-US';
      const key = periodType === 'week'
        ? `${t('period')} ${periodNum}`
        : startDate.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });

      const endDate = periodType === 'week'
        ? new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

      periods.push({ period: key, date: new Date(startDate), endDate });

      if (periodType === 'week') {
        startDate.setDate(startDate.getDate() + 7);
        periodNum++;
      } else {
        startDate.setDate(startDate.getDate() + 1);
      }
    }

    const result = periods.map(({ period, date, endDate }) => {
      const periodData: { period: string; [key: string]: number | string } = { period };

      sortedWebhooks.forEach((webhook, index) => {
        const webhookKey = `webhook_${index}`;
        if (new Date(webhook.createdAt) <= endDate && webhook.lastTriggeredAt) {
          const triggerDate = new Date(webhook.lastTriggeredAt);
          periodData[webhookKey] = triggerDate >= date && triggerDate < endDate ? 1 : 0;
        } else {
          periodData[webhookKey] = 0;
        }
      });

      return periodData;
    });

    const webhookNames = sortedWebhooks.map((webhook, index) => ({
      key: `webhook_${index}`,
      name: webhook.name,
    }));

    return { data: result, webhookNames };
  }, [webhooks, t]);

  return (
    <Stack gap="md">
      <SectionCard icon={IconWebhook} title={t('whatAreWebhooks')}>
        <Text size="sm" c="dimmed">{t('webhooksDescription')}</Text>
      </SectionCard>

      <SectionCard
        icon={IconWebhook}
        title={t('title')}
        actions={
          <Button
            size="xs"
            leftSection={<IconPlus size={14} stroke={1.7} />}
            onClick={() => { setFormData(EMPTY_FORM); setCreateOpened(true); }}
          >
            {t('createWebhook')}
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
        ) : webhooks.length === 0 ? (
          <Center py={48}>
            <Stack align="center" gap="sm">
              <ThemeIcon color="gray" variant="light" size={48} radius="xl">
                <IconWebhook size={24} stroke={1.5} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">{t('noWebhooks')}</Text>
            </Stack>
          </Center>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="xs" miw={900}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('table.name')}</Table.Th>
                  <Table.Th>{t('table.url')}</Table.Th>
                  <Table.Th>{t('table.events')}</Table.Th>
                  <Table.Th>{t('table.status')}</Table.Th>
                  <Table.Th>{t('table.lastExecution')}</Table.Th>
                  <Table.Th>{t('table.failures')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {webhooks.map((webhook) => (
                  <Table.Tr key={webhook.id}>
                    <Table.Td><Text size="sm" fw={550}>{webhook.name}</Text></Table.Td>
                    <Table.Td>
                      <Text size="xs" ff="monospace" truncate maw={200} title={webhook.url}>
                        {webhook.url}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {webhook.events.map((event) => (
                          <Badge key={event} size="xs" variant="light" color="gray">
                            {event}
                          </Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={webhook.active ? 'green' : 'gray'}>
                        {webhook.active ? t('active') : t('inactive')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {webhook.lastTriggeredAt ? (
                        <Stack gap={0}>
                          <Text size="xs">{formatDate(webhook.lastTriggeredAt)}</Text>
                          <Text size="xs" c={webhook.lastSuccessAt ? 'green' : 'red'}>
                            {webhook.lastSuccessAt ? t('success') : t('error')}
                          </Text>
                        </Stack>
                      ) : (
                        <Text size="xs" c="dimmed">{t('never')}</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {webhook.failureCount > 0 ? (
                        <Badge size="sm" variant="light" color="red">{webhook.failureCount}</Badge>
                      ) : (
                        <Text size="sm" c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={2} wrap="nowrap">
                        <MantineTooltip label={t('edit')}>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            aria-label={t('edit')}
                            onClick={() => handleEdit(webhook)}
                          >
                            <IconPencil size={15} stroke={1.7} />
                          </ActionIcon>
                        </MantineTooltip>
                        <MantineTooltip label={webhook.active ? t('deactivate') : t('activate')}>
                          <ActionIcon
                            variant="subtle"
                            color={webhook.active ? 'yellow' : 'green'}
                            size="sm"
                            aria-label={webhook.active ? t('deactivate') : t('activate')}
                            onClick={() => handleToggleActive(webhook.id, webhook.active)}
                          >
                            {webhook.active
                              ? <IconPlayerPause size={15} stroke={1.7} />
                              : <IconPlayerPlay size={15} stroke={1.7} />}
                          </ActionIcon>
                        </MantineTooltip>
                        <MantineTooltip label={t('delete')}>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            aria-label={t('delete')}
                            onClick={() => setWebhookToDelete(webhook)}
                          >
                            <IconTrash size={15} stroke={1.7} />
                          </ActionIcon>
                        </MantineTooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </SectionCard>

      {!loading && webhooks.length > 0 && chartData.data.length > 0 && (
        <SectionCard icon={IconChartLine} title={t('triggersEvolution')}>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData.data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="period" {...axisProps} />
              <YAxis
                {...axisProps}
                domain={[0, 1]}
                ticks={[0, 1]}
                width={100}
                tickFormatter={(value) => (value === 1 ? t('triggered') : t('notTriggered'))}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => {
                  const webhookIndex = parseInt(name.replace('webhook_', ''));
                  const webhookName = chartData.webhookNames[webhookIndex]?.name || name;
                  return [value === 1 ? t('triggered') : t('notTriggered'), webhookName];
                }}
                labelFormatter={(label) => `${t('period')} ${label}`}
              />
              <Legend
                formatter={(value) => {
                  const webhookIndex = parseInt(String(value).replace('webhook_', ''));
                  return chartData.webhookNames[webhookIndex]?.name || value;
                }}
              />
              {chartData.webhookNames.map((webhook, index) => (
                <Line
                  key={webhook.key}
                  type="monotone"
                  dataKey={webhook.key}
                  stroke={seriesColor(index)}
                  strokeWidth={2}
                  name={webhook.key}
                  dot={{ fill: seriesColor(index), strokeWidth: 2, r: 3 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      <Modal
        opened={createOpened}
        onClose={() => { setCreateOpened(false); setFormData(EMPTY_FORM); }}
        title={t('createModal.title')}
        size="lg"
      >
        <WebhookForm
          namespace="createModal"
          value={formData}
          onChange={setFormData}
          onSubmit={handleCreate}
          onCancel={() => { setCreateOpened(false); setFormData(EMPTY_FORM); }}
          submitLabel={t('createModal.create')}
        />
      </Modal>

      <Modal
        opened={editingWebhook !== null}
        onClose={() => { setEditingWebhook(null); setFormData(EMPTY_FORM); }}
        title={t('editModal.title')}
        size="lg"
      >
        <WebhookForm
          namespace="editModal"
          value={formData}
          onChange={setFormData}
          onSubmit={handleUpdate}
          onCancel={() => { setEditingWebhook(null); setFormData(EMPTY_FORM); }}
          submitLabel={t('editModal.save')}
        />
      </Modal>

      {/* Delete confirmation — replaces the native confirm() dialog */}
      <Modal
        opened={webhookToDelete !== null}
        onClose={() => setWebhookToDelete(null)}
        title={t('deleteTitle')}
      >
        <Stack gap="md">
          <Text size="sm">{t('deleteConfirm')}</Text>
          {webhookToDelete && <Code>{webhookToDelete.name}</Code>}
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setWebhookToDelete(null)}>
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
