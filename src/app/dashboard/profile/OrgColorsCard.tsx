'use client';

import { Card, Alert, Button, Loader, SimpleGrid, Group, Text, Title, TextInput, ActionIcon } from '@mantine/core';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
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

  return (
    <Card mb="md">
        <Title order={6} mb="sm">{t('branding.colors')}</Title>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <div>
            {logoUrl && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: 'var(--mantine-color-default-hover)', border: '1px solid var(--mantine-color-default-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 120 }}>
                <Image src={logoUrl} alt="Logo" width={120} height={40} style={{ objectFit: 'contain', maxWidth: '100%' }} unoptimized />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <Text size="sm" fw={600} c="dimmed" mb={4}>
                {t('branding.colorPrimary')}
                <Text component="span" size="xs" c="dimmed" fw={400} display="block">{t('branding.colorPrimaryHint')}</Text>
              </Text>
              <Group gap="xs">
                <input
                  type="color"
                  value={colorPrimary}
                  onChange={e => setColorPrimary(e.target.value)}
                  style={{ width: 40, height: 36, border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, cursor: 'pointer', padding: 2 }}
                />
                <TextInput
                  value={colorPrimary}
                  onChange={e => setColorPrimary(e.target.value)}
                  maxLength={7}
                  size="xs"
                  w={100}
                  styles={{ input: { fontFamily: 'monospace' } }}
                />
                <ActionIcon variant="subtle" color="gray" onClick={() => setColorPrimary('#1752CC')} title={t('branding.colorsReset')}>
                  <i className="bi bi-arrow-counterclockwise" />
                </ActionIcon>
              </Group>
            </div>

            <div style={{ marginBottom: 24 }}>
              <Text size="sm" fw={600} c="dimmed" mb={4}>
                {t('branding.colorSecondary')}
                <Text component="span" size="xs" c="dimmed" fw={400} display="block">{t('branding.colorSecondaryHint')}</Text>
              </Text>
              <Group gap="xs">
                <input
                  type="color"
                  value={colorSecondary || colorPrimary}
                  onChange={e => setColorSecondary(e.target.value)}
                  style={{ width: 40, height: 36, border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, cursor: 'pointer', padding: 2 }}
                />
                <TextInput
                  value={colorSecondary}
                  onChange={e => setColorSecondary(e.target.value)}
                  maxLength={7}
                  placeholder="#opcional"
                  size="xs"
                  w={100}
                  styles={{ input: { fontFamily: 'monospace' } }}
                />
                <ActionIcon variant="subtle" color="gray" onClick={() => setColorSecondary('')} title={t('branding.colorsReset')}>
                  <i className="bi bi-arrow-counterclockwise" />
                </ActionIcon>
              </Group>
            </div>

            <Group gap="sm">
              <Button
                size="xs"
                onClick={handleSave}
                disabled={saving}
                leftSection={saving ? <Loader size="xs" color="white" /> : <i className="bi bi-palette" />}
              >
                {saving ? t('branding.colorsSaving') : t('branding.colorsSave')}
              </Button>
              {feedback && (
                <Alert
                  color={feedback.type === 'success' ? 'green' : 'red'}
                  py={4} px={12}
                  icon={<i className={`bi bi-${feedback.type === 'success' ? 'check-circle' : 'exclamation-triangle'}`} />}
                >
                  {feedback.message}
                </Alert>
              )}
            </Group>
          </div>

          <div>
            <Text size="sm" c="dimmed" mb="xs">
              <i className="bi bi-eye" style={{ marginRight: 4 }} />Preview
            </Text>
            <LoginPreview
              logoUrl={logoUrl}
              orgName={orgName}
              colorPrimary={colorPrimary}
              colorSecondary={colorSecondary}
            />
          </div>
        </SimpleGrid>
    </Card>
  );
}
