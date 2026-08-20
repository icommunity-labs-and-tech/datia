'use client';

import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';

interface SectionCardProps {
  icon?: React.ElementType;
  /** Accent for the icon chip. Defaults to the brand blue. */
  color?: string;
  title: string;
  description?: string;
  /** Right-aligned content in the section header — badges, buttons. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Titled surface used across the settings and developer screens, so every
 * section carries the same header rhythm instead of hand-rolled headings.
 */
export default function SectionCard({
  icon: Icon,
  color = 'datiaBlue',
  title,
  description,
  actions,
  children,
}: SectionCardProps) {
  return (
    <Card p="lg" radius="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm" mb="md">
        <Group gap="sm" align="flex-start" wrap="nowrap" style={{ minWidth: 0 }}>
          {Icon && (
            <ThemeIcon variant="light" color={color} size={30} radius="sm" style={{ flexShrink: 0 }}>
              <Icon size={16} stroke={1.7} />
            </ThemeIcon>
          )}
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Title order={4}>{title}</Title>
            {description && (
              <Text size="sm" c="dimmed">{description}</Text>
            )}
          </Stack>
        </Group>
        {actions && <Group gap="xs" style={{ flexShrink: 0 }}>{actions}</Group>}
      </Group>

      {children}
    </Card>
  );
}
