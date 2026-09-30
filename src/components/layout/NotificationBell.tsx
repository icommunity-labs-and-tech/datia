'use client';

import { useCallback, useEffect, useState } from 'react';
import { ActionIcon, Indicator, Menu, Text, Box, Group, Button, ScrollArea } from '@mantine/core';
import { IconBell, IconCircleFilled } from '@tabler/icons-react';
import { useTranslations, useLocale } from 'next-intl';
import { listNotifications, unreadNotificationCount } from '@/actions/notifications/list';
import { markNotificationRead, markAllNotificationsRead } from '@/actions/notifications/mark-read';
import type { NotificationRecord } from '@/domain/notifications/types';

const POLL_MS = 60_000;

const TYPE_COLOR: Record<NotificationRecord['type'], string> = {
  INFO: 'blue',
  WARNING: 'yellow',
  ERROR: 'red',
  SUCCESS: 'green',
};

export default function NotificationBell() {
  const t = useTranslations('notifications');
  const locale = useLocale();
  const [opened, setOpened] = useState(false);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const count = await unreadNotificationCount();
      if (!cancelled) setUnreadCount(count);
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const openDropdown = useCallback(async () => {
    setOpened(true);
    const panel = await listNotifications();
    setItems(panel.items);
    setUnreadCount(panel.unreadCount);
    setLoaded(true);
  }, []);

  const handleItemClick = useCallback(async (notification: NotificationRecord) => {
    if (notification.read) return;
    setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await markNotificationRead(notification.id);
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markAllNotificationsRead();
  }, []);

  return (
    <Menu shadow="lg" width={340} position="bottom-end" opened={opened} onChange={(next) => (next ? openDropdown() : setOpened(false))}>
      <Menu.Target>
        {unreadCount > 0 ? (
          <Indicator
            label={unreadCount > 9 ? '9+' : unreadCount}
            size={16}
            color="red"
            offset={4}
            data-testid="notification-unread-badge"
          >
            <ActionIcon variant="subtle" color="gray" size="lg" radius="md" aria-label={t('bell')}>
              <IconBell size={19} stroke={1.6} />
            </ActionIcon>
          </Indicator>
        ) : (
          <ActionIcon variant="subtle" color="gray" size="lg" radius="md" aria-label={t('bell')}>
            <IconBell size={19} stroke={1.6} />
          </ActionIcon>
        )}
      </Menu.Target>
      <Menu.Dropdown p={0}>
        <Group justify="space-between" px="sm" py={8}>
          <Text size="xs" fw={600} c="dark">
            {t('title')}
          </Text>
          {unreadCount > 0 && (
            <Button variant="subtle" size="compact-xs" onClick={handleMarkAllRead}>
              {t('markAllRead')}
            </Button>
          )}
        </Group>
        <Menu.Divider m={0} />
        <ScrollArea.Autosize mah={360}>
          {!loaded ? null : items.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="lg">
              {t('empty')}
            </Text>
          ) : (
            items.map((notification) => (
              <Box
                key={notification.id}
                onClick={() => handleItemClick(notification)}
                px="sm"
                py={8}
                style={{
                  cursor: notification.read ? 'default' : 'pointer',
                  background: notification.read ? 'transparent' : 'var(--mantine-color-blue-0)',
                  borderBottom: '1px solid var(--mantine-color-gray-1)',
                }}
              >
                <Group gap={6} wrap="nowrap" align="flex-start">
                  <IconCircleFilled size={8} color={`var(--mantine-color-${TYPE_COLOR[notification.type]}-6)`} style={{ marginTop: 6, flexShrink: 0 }} />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={notification.read ? 400 : 600} truncate>
                      {notification.title}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {notification.message}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      {new Date(notification.createdAt).toLocaleString(locale)}
                    </Text>
                  </Box>
                </Group>
              </Box>
            ))
          )}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );
}
