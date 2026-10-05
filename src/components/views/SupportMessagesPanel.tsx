'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Menu,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconCheck, IconChevronDown, IconInbox, IconMailOpened, IconTrash } from '@tabler/icons-react';
import PageHeader from '@/components/layout/PageHeader';
import { listSupportMessages } from '@/actions/support-messages/list';
import { updateSupportMessageStatus } from '@/actions/support-messages/updateStatus';
import { deleteSupportMessage } from '@/actions/support-messages/delete';
import type { SupportMessageListItem, SupportMessageStatus } from '@/domain/support-messages/types';

const STATUSES: SupportMessageStatus[] = ['pending', 'read', 'resolved'];
const STATUS_COLOR: Record<SupportMessageStatus, string> = { pending: 'yellow', read: 'blue', resolved: 'green' };

function StatusDot({ status }: { status: SupportMessageStatus }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: `var(--mantine-color-${STATUS_COLOR[status]}-6)`,
        flexShrink: 0,
      }}
    />
  );
}

export default function SupportMessagesPanel() {
  const t = useTranslations('superadminSupport');
  const locale = useLocale();
  const [messages, setMessages] = useState<SupportMessageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<SupportMessageListItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await listSupportMessages();
      setMessages(data as SupportMessageListItem[]);
    } catch (error) {
      console.error('Error loading support messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: SupportMessageStatus) => {
    try {
      await updateSupportMessageStatus(id, status);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
      setSelectedMessage((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteSupportMessage(deleteId);
      setMessages((prev) => prev.filter((m) => m.id !== deleteId));
      setSelectedMessage((prev) => (prev && prev.id === deleteId ? null : prev));
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    } finally {
      setDeleting(false);
    }
  };

  const openMessage = (message: SupportMessageListItem) => {
    setSelectedMessage(message);
    if (message.status === 'pending') handleStatusChange(message.id, 'read');
  };

  const dateTime = (value: Date) =>
    new Date(value).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });

  const pendingCount = messages.filter((m) => m.status === 'pending').length;

  return (
    <>
      <PageHeader
        title={t('title')}
        description={pendingCount > 0 ? t('pendingCount', { count: pendingCount }) : undefined}
      />

      <Paper withBorder radius="md" p="md">
        {loading ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <Loader />
              <Text size="sm" c="dimmed">{t('loading')}</Text>
            </Stack>
          </Center>
        ) : messages.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="sm">
              <ThemeIcon color="gray" variant="light" size={48} radius="xl">
                <IconInbox size={24} stroke={1.5} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">{t('empty')}</Text>
            </Stack>
          </Center>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="xs" miw={800}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('table.organization')}</Table.Th>
                  <Table.Th>{t('table.subject')}</Table.Th>
                  <Table.Th>{t('table.page')}</Table.Th>
                  <Table.Th ta="center">{t('table.status')}</Table.Th>
                  <Table.Th>{t('table.date')}</Table.Th>
                  <Table.Th ta="center">{t('table.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {messages.map((msg) => (
                  <Table.Tr key={msg.id} style={{ cursor: 'pointer' }} onClick={() => openMessage(msg)}>
                    <Table.Td>
                      <Group gap={8} wrap="nowrap">
                        {msg.status === 'pending' && <StatusDot status="pending" />}
                        <Text size="sm" fw={600}>{msg.organizationName || '—'}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td><Text size="sm">{msg.subject}</Text></Table.Td>
                    <Table.Td>
                      {msg.page ? <Text component="code" size="xs" c="dimmed">{msg.page}</Text> : <Text size="sm" c="dimmed">—</Text>}
                    </Table.Td>
                    <Table.Td ta="center">
                      <Badge variant="light" color={STATUS_COLOR[msg.status]}>{t(`status.${msg.status}`)}</Badge>
                    </Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{dateTime(msg.createdAt)}</Text></Table.Td>
                    <Table.Td ta="center" onClick={(e) => e.stopPropagation()}>
                      <Menu shadow="md" width={200} position="bottom-end">
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" aria-label={t('table.actions')}>
                            <IconChevronDown size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Label>{t('menu.changeStatus')}</Menu.Label>
                          {STATUSES.map((status) => (
                            <Menu.Item
                              key={status}
                              fw={msg.status === status ? 700 : 400}
                              leftSection={<StatusDot status={status} />}
                              onClick={() => handleStatusChange(msg.id, status)}
                            >
                              {t(`status.${status}`)}
                            </Menu.Item>
                          ))}
                          <Menu.Divider />
                          <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => setDeleteId(msg.id)}>
                            {t('menu.delete')}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>

      <Modal
        opened={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        title={
          <Group gap="xs">
            <IconMailOpened size={18} />
            <Text fw={600}>{selectedMessage?.subject}</Text>
          </Group>
        }
        size="lg"
      >
        {selectedMessage && (
          <Stack gap="md">
            <Group gap="xl" align="flex-start">
              <div>
                <Text size="xs" c="dimmed">{t('detail.organization')}</Text>
                <Text size="sm" fw={600}>{selectedMessage.organizationName || '—'}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{t('detail.page')}</Text>
                {selectedMessage.page ? <Text component="code" size="sm">{selectedMessage.page}</Text> : <Text size="sm">—</Text>}
              </div>
              <div>
                <Text size="xs" c="dimmed">{t('detail.date')}</Text>
                <Text size="sm">{dateTime(selectedMessage.createdAt)}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{t('table.status')}</Text>
                <Badge variant="light" color={STATUS_COLOR[selectedMessage.status]}>
                  {t(`status.${selectedMessage.status}`)}
                </Badge>
              </div>
            </Group>
            <Paper withBorder radius="md" p="md" bg="var(--mantine-color-gray-0)">
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{selectedMessage.message}</Text>
            </Paper>
            <Group justify="flex-end" gap="xs">
              {selectedMessage.status !== 'resolved' && (
                <Button
                  color="green"
                  leftSection={<IconCheck size={16} />}
                  onClick={() => handleStatusChange(selectedMessage.id, 'resolved')}
                >
                  {t('detail.markResolved')}
                </Button>
              )}
              <Button variant="default" onClick={() => setSelectedMessage(null)}>{t('detail.close')}</Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal opened={!!deleteId} onClose={() => setDeleteId(null)} title={t('deleteModal.title')} centered>
        <Stack gap="md">
          <Alert color="red" variant="light">{t('deleteModal.body')}</Alert>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setDeleteId(null)} disabled={deleting}>{t('deleteModal.cancel')}</Button>
            <Button color="red" leftSection={<IconTrash size={16} />} onClick={handleDelete} loading={deleting}>
              {t('menu.delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
