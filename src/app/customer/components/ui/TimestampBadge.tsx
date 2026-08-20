'use client';

import { Group, Text } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { formatDateTime } from '../../utils/dateFormatters';

interface TimestampBadgeProps {
  timestamp: string;
}

export function TimestampBadge({ timestamp }: TimestampBadgeProps) {
  return (
    <Group gap={4} wrap="nowrap" c="dimmed">
      <IconClock size={13} stroke={1.7} />
      <Text size="xs" style={{ whiteSpace: 'nowrap' }}>
        {formatDateTime(timestamp)}
      </Text>
    </Group>
  );
}
