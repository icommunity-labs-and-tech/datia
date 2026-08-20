'use client';

import { ActionIcon, Alert, Button, Card, ColorInput, Group, Image as MantineImage, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconArrowBackUp, IconPalette, IconCircleCheck, IconAlertTriangle, IconEye } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { updateOrgBranding } from '@/actions/organizations/update-org-branding';
import LoginPreview from '@/components/auth/LoginPreview';

interface Props {
  logoUrl: string | null;
  orgName: string;
  initialColorPrimary: string;
  initialColorSecondary: string;
}

export default function OrgColorsCard({ logoUrl, orgName, initialColorPrimary, initialColorSecondary }: Props) {
  const t = useTranslations('profile');
  const [colorPrimary, setColorPrimary] = useState(initialColorPrimary);
  const [colorSecondary, setColorSecondary] = useState(initialColorSecondary);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    const result = await updateOrgBranding({
      brandColorPrimary: colorPrimary || null,
      brandColorSecondary: colorSecondary || null,
    });
    setSaving(false);
    if (result.error) {
      setFeedback({ type: 'error', message: result.error });
    } else {
      setFeedback({ type: 'success', message: t('branding.colorsSuccess') });
    }
  };

  const swatch = (
    label: string,
    hint: string,
    value: string,
    onChangeValue: (next: string) => void,
    onReset: () => void,
    placeholder?: string
  ) => (
    <Stack gap={4}>
      <Text size="sm" fw={600}>{label}</Text>
      <Text size="xs" c="dimmed">{hint}</Text>
      <Group gap="xs" wrap="nowrap">
        <ColorInput
          value={value}
          onChange={onChangeValue}
          placeholder={placeholder}
          size="xs"
          w={150}
          format="hex"
          withEyeDropper={false}
          styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
        />
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={onReset}
          aria-label={t('branding.colorsReset')}
          title={t('branding.colorsReset')}
        >
          <IconArrowBackUp size={16} stroke={1.7} />
        </ActionIcon>
      </Group>
    </Stack>
  );

  return (
    <Card p="lg" radius="md">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Stack gap="lg">
          {logoUrl && (
            <MantineImage
              src={logoUrl}
              alt={orgName}
              h={40}
              w="auto"
              fit="contain"
              style={{
                alignSelf: 'flex-start',
                background: 'var(--mantine-color-gray-0)',
                borderRadius: 8,
                padding: 10,
              }}
            />
          )}

          {swatch(
            t('branding.colorPrimary'),
            t('branding.colorPrimaryHint'),
            colorPrimary,
            setColorPrimary,
            () => setColorPrimary('#1752CC')
          )}

          {swatch(
            t('branding.colorSecondary'),
            t('branding.colorSecondaryHint'),
            colorSecondary,
            setColorSecondary,
            () => setColorSecondary(''),
            '#opcional'
          )}

          <Group gap="sm">
            <Button
              size="xs"
              onClick={handleSave}
              loading={saving}
              leftSection={<IconPalette size={15} stroke={1.7} />}
            >
              {t('branding.colorsSave')}
            </Button>
          </Group>

          {feedback && (
            <Alert
              variant="light"
              radius="md"
              color={feedback.type === 'success' ? 'green' : 'red'}
              icon={feedback.type === 'success' ? <IconCircleCheck size={16} /> : <IconAlertTriangle size={16} />}
            >
              <Text size="sm">{feedback.message}</Text>
            </Alert>
          )}
        </Stack>

        <Stack gap="xs">
          <Group gap={6} c="dimmed">
            <IconEye size={14} stroke={1.7} />
            <Text size="sm">Preview</Text>
          </Group>
          <LoginPreview
            logoUrl={logoUrl}
            orgName={orgName}
            colorPrimary={colorPrimary}
            colorSecondary={colorSecondary}
          />
        </Stack>
      </SimpleGrid>
    </Card>
  );
}
