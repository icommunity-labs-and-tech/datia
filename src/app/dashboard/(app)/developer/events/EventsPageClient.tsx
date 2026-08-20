'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Badge,
  Button,
  Center,
  Code,
  Modal,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  ThemeIcon,
  ScrollArea,
  Group,
} from '@mantine/core';
import { IconCalendarEvent, IconChartLine, IconEye } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { listEvents } from '@/actions/events/list';
import { listEventsByType } from '@/actions/events/listByType';
import SectionCard from '@/components/layout/SectionCard';
import { colors, axisProps, gridProps, tooltipStyle } from '@/components/charts/theme';

interface EventLog {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  data: Record<string, any>;
  createdAt: Date;
}

/** One accent per event type, so table badges and chart lines agree. */
function eventColor(eventType: string) {
  if (eventType === 'item.created') return { badge: 'datiaBlue', line: colors.blue };
  if (eventType === 'state.created') return { badge: 'cyan', line: colors.sky };
  return { badge: 'gray', line: colors.amber };
}

export default function EventsPageClient() {
  const t = useTranslations('developer.events');
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventLog | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const result = filterType === 'all'
        ? await listEvents(100)
        : await listEventsByType(filterType, 100);

      if (result.success && result.data) {
        setEvents(result.data);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const formatDate = (date: Date) => {
    const locale = typeof window !== 'undefined' ? navigator.language : 'en-US';
    return new Date(date).toLocaleString(locale);
  };

  // Event volume over time, bucketed by week when the range is long.
  const chartData = useMemo(() => {
    if (events.length === 0) return { data: [], eventTypes: [] };

    const now = new Date();
    const sortedEvents = [...events].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const oldestDate = new Date(sortedEvents[0].createdAt);
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

    const eventTypes = Array.from(new Set(events.map(e => e.eventType)));

    const result = periods.map(({ period, date, endDate }) => {
      const periodData: { period: string; [key: string]: number | string } = { period };

      eventTypes.forEach(eventType => {
        periodData[eventType] = sortedEvents.filter(event => {
          const eventDate = new Date(event.createdAt);
          return event.eventType === eventType && eventDate >= date && eventDate < endDate;
        }).length;
      });

      return periodData;
    });

    return { data: result, eventTypes };
  }, [events, t]);

  const filterSelect = (
    <Select
      value={filterType}
      onChange={(value) => setFilterType(value ?? 'all')}
      size="xs"
      w={190}
      allowDeselect={false}
      aria-label={t('filter.all')}
      data={[
        { value: 'all', label: t('filter.all') },
        { value: 'item.created', label: t('filter.itemCreated') },
        { value: 'state.created', label: t('filter.stateCreated') },
      ]}
    />
  );

  return (
    <Stack gap="md">
      <SectionCard icon={IconCalendarEvent} title={t('whatAreEvents')}>
        <Text size="sm" c="dimmed">{t('eventsDescription')}</Text>
      </SectionCard>

      <SectionCard icon={IconCalendarEvent} title={t('title')} actions={filterSelect}>
        {loading ? (
          <Stack gap="xs">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={38} radius="sm" />
            ))}
          </Stack>
        ) : events.length === 0 ? (
          <Center py={48}>
            <Stack align="center" gap="sm">
              <ThemeIcon color="gray" variant="light" size={48} radius="xl">
                <IconCalendarEvent size={24} stroke={1.5} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">{t('noEvents')}</Text>
            </Stack>
          </Center>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="xs" miw={640}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('table.type')}</Table.Th>
                  <Table.Th>{t('table.entity')}</Table.Th>
                  <Table.Th>{t('table.entityId')}</Table.Th>
                  <Table.Th>{t('table.date')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {events.map((event) => (
                  <Table.Tr key={event.id}>
                    <Table.Td>
                      <Badge size="sm" variant="light" color={eventColor(event.eventType).badge}>
                        {event.eventType}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{event.entityType}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Code>{event.entityId}</Code>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{formatDate(event.createdAt)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        variant="subtle"
                        size="compact-xs"
                        leftSection={<IconEye size={13} stroke={1.7} />}
                        onClick={() => setSelectedEvent(event)}
                      >
                        {t('viewDetails')}
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </SectionCard>

      {!loading && events.length > 0 && chartData.data.length > 0 && (
        <SectionCard icon={IconChartLine} title={t('evolution')}>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData.data} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="period" {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => {
                  const eventText = value !== 1 ? t('eventsPlural') : t('event');
                  return [`${value} ${eventText}`, ''];
                }}
                labelFormatter={(label) => `${t('period')} ${label}`}
              />
              <Legend />
              {chartData.eventTypes.map((eventType) => (
                <Line
                  key={eventType}
                  type="monotone"
                  dataKey={eventType}
                  stroke={eventColor(eventType).line}
                  strokeWidth={2}
                  name={eventType}
                  dot={{ fill: eventColor(eventType).line, strokeWidth: 2, r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      <Modal
        opened={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title={t('detailsModal.title')}
        size="lg"
      >
        {selectedEvent && (
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{t('detailsModal.eventType').replace(':', '')}</Text>
              <Badge size="sm" variant="light" color={eventColor(selectedEvent.eventType).badge}>
                {selectedEvent.eventType}
              </Badge>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{t('detailsModal.entityType').replace(':', '')}</Text>
              <Text size="sm" fw={550}>{selectedEvent.entityType}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{t('detailsModal.entityId').replace(':', '')}</Text>
              <Code>{selectedEvent.entityId}</Code>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">{t('detailsModal.date').replace(':', '')}</Text>
              <Text size="sm" fw={550}>{formatDate(selectedEvent.createdAt)}</Text>
            </Group>
            <Stack gap={6}>
              <Text size="sm" c="dimmed">{t('detailsModal.data').replace(':', '')}</Text>
              <Code block mah={360} style={{ overflow: 'auto' }}>
                {JSON.stringify(selectedEvent.data, null, 2)}
              </Code>
            </Stack>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
