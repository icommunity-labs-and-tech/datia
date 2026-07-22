'use client';

import { Card, Alert, Button, Loader, Group, Text, Title } from '@mantine/core';
import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
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
    <Card mb="md">
        <Title order={6} mb="sm">{t('branding.currentLogo')}</Title>

        {logoUrl ? (
          <div className="mb-3">
            <Image
              src={logoUrl}
              alt="Logo de la organización"
              width={180}
              height={60}
              style={{ objectFit: 'contain', background: '#f8f9fa', borderRadius: 8, padding: 8 }}
              unoptimized
            />
          </div>
        ) : (
          <Text size="sm" c="dimmed" mb="sm">
            <i className="bi bi-image" style={{ marginRight: 4 }} />
            {t('branding.noLogo')}
          </Text>
        )}

        <Text size="sm" c="dimmed" mb="sm">
          <i className="bi bi-info-circle" style={{ marginRight: 4 }} />
          {t('branding.formatHint')}
        </Text>

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
            disabled={uploading || deleting}
            leftSection={uploading ? <Loader size="xs" /> : <i className="bi bi-upload" />}
          >
            {uploading ? t('branding.uploading') : t('branding.uploadLogo')}
          </Button>

          {logoUrl && (
            <Button
              variant="light"
              color="red"
              size="xs"
              onClick={handleDelete}
              disabled={uploading || deleting}
              leftSection={deleting ? <Loader size="xs" /> : <i className="bi bi-trash" />}
            >
              {deleting ? t('branding.deleting') : t('branding.deleteLogo')}
            </Button>
          )}
        </Group>

        {feedback && (
          <Alert
            color={feedback.type === 'success' ? 'green' : 'red'}
            mt="md"
            py={8}
            icon={<i className={`bi bi-${feedback.type === 'success' ? 'check-circle' : 'exclamation-triangle'}`} />}
          >
            {feedback.message}
          </Alert>
        )}
    </Card>
  );
}
