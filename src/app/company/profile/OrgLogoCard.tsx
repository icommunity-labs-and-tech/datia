'use client';

import { Alert, Button, Card, Group, Image as MantineImage, Stack, Text } from '@mantine/core';
import { IconUpload, IconTrash, IconPhoto, IconInfoCircle, IconCircleCheck, IconAlertTriangle } from '@tabler/icons-react';
import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { updateOrgLogo } from '@/actions/organizations/update-org-logo';
import { deleteOrgLogo } from '@/actions/organizations/delete-org-logo';

interface Props {
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
}

export default function OrgLogoCard({ logoUrl, onLogoChange }: Props) {
  const t = useTranslations('profile');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    const formData = new FormData();
    formData.append('logo', file);
    const result = await updateOrgLogo(formData);
    setUploading(false);
    if (result.error) {
      setFeedback({ type: 'error', message: result.error });
    } else {
      onLogoChange(result.logoUrl ?? null);
      setFeedback({ type: 'success', message: t('branding.uploadSuccess') });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async () => {
    setDeleting(true);
    setFeedback(null);
    const result = await deleteOrgLogo();
    setDeleting(false);
    if (result.error) {
      setFeedback({ type: 'error', message: result.error });
    } else {
      onLogoChange(null);
      setFeedback({ type: 'success', message: t('branding.deleteSuccess') });
    }
  };

  return (
    <Card p="lg" radius="md">
      <Stack gap="md">
        {logoUrl ? (
          <MantineImage
            src={logoUrl}
            alt={t('branding.currentLogo')}
            h={60}
            w="auto"
            fit="contain"
            style={{
              alignSelf: 'flex-start',
              background: 'var(--mantine-color-gray-0)',
              borderRadius: 8,
              padding: 8,
            }}
          />
        ) : (
          <Group gap={6} c="dimmed">
            <IconPhoto size={15} stroke={1.7} />
            <Text size="sm">{t('branding.noLogo')}</Text>
          </Group>
        )}

        <Group gap={6} wrap="nowrap" align="flex-start">
          <IconInfoCircle size={14} stroke={1.7} style={{ marginTop: 2, flexShrink: 0, color: 'var(--mantine-color-gray-5)' }} />
          <Text size="xs" c="dimmed">{t('branding.formatHint')}</Text>
        </Group>

        <Group gap="xs">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
          <Button
            variant="default"
            size="xs"
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
            disabled={deleting}
            leftSection={<IconUpload size={15} stroke={1.7} />}
          >
            {t('branding.uploadLogo')}
          </Button>

          {logoUrl && (
            <Button
              variant="light"
              color="red"
              size="xs"
              onClick={handleDelete}
              loading={deleting}
              disabled={uploading}
              leftSection={<IconTrash size={15} stroke={1.7} />}
            >
              {t('branding.deleteLogo')}
            </Button>
          )}
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
    </Card>
  );
}
