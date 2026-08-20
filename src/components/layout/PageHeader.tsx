'use client';

import { Group, Stack, Text, Title, Box } from '@mantine/core';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned actions (buttons, filters). Wraps below the title on mobile. */
  actions?: React.ReactNode;
  /** Rendered under the title/description block — counters, badges, tabs. */
  children?: React.ReactNode;
}

export default function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  return (
    <Box mb="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Title order={2}>{title}</Title>
          {description && (
            <Text size="sm" c="dimmed" maw={640}>
              {description}
            </Text>
          )}
        </Stack>
        {actions && <Group gap="xs">{actions}</Group>}
      </Group>
      {children}
    </Box>
  );
}
