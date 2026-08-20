'use client';

import { Box, Container, Group, Image, Stack, Text } from '@mantine/core';
import { useTranslations } from 'next-intl';

interface PassportShellProps {
  /** Issuing organisation, when the asset is already loaded. */
  organization?: { name: string; logoUrl: string | null; brandColorPrimary: string | null } | null;
  children: React.ReactNode;
}

/**
 * Public wrapper for everything under /customer. Carries the issuing
 * organisation's identity — this is the page an end customer reaches by
 * scanning a QR on a physical asset, so whose passport it is must be obvious.
 */
export default function PassportShell({ organization, children }: PassportShellProps) {
  const t = useTranslations('customer');
  const accent = organization?.brandColorPrimary || 'var(--mantine-color-datiaBlue-6)';

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'var(--mantine-color-gray-0)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Brand bar */}
      <Box
        style={{
          background: 'var(--mantine-color-white)',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          borderTop: `3px solid ${accent}`,
        }}
      >
        <Container size={720} px="md">
          <Group h={56} justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              {organization?.logoUrl ? (
                <Image
                  src={organization.logoUrl}
                  alt={organization.name}
                  h={26}
                  w="auto"
                  fit="contain"
                />
              ) : (
                <Image src="/logo-datia.svg" alt="datia" h={24} w="auto" fit="contain" />
              )}
            </Group>
            <Text size="xs" c="dimmed" tt="uppercase" fw={650} lts={0.5} style={{ flexShrink: 0 }}>
              {t('passport.title')}
            </Text>
          </Group>
        </Container>
      </Box>

      <Container size={720} px="md" py="lg" style={{ flex: 1, width: '100%' }}>
        {children}
      </Container>

      <Box py="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
        <Container size={720} px="md">
          <Stack gap={2} align="center">
            {organization?.name && (
              <Text size="xs" c="dimmed">
                {t('passport.issuedBy')} <strong>{organization.name}</strong>
              </Text>
            )}
            <Text size="xs" c="dimmed">{t('copyright')}</Text>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
