'use client';

import { useState } from 'react';
import { Alert, Button, Group, Modal, NumberInput, Stack, TextInput, Textarea } from '@mantine/core';
import { IconAlertTriangleFilled } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { createAsset } from '@/actions/assets/createAsset';

interface CreateAssetModalProps {
  opened: boolean;
  onClose: () => void;
  /** Called once the asset exists, so the list reloads. */
  onCreated: () => void;
}

/**
 * Creates an asset from the dashboard.
 *
 * Its position is a field of the asset (#37), so it is asked for here: without
 * coordinates the asset stays out of the map and its installation.
 */
export default function CreateAssetModal({ opened, onClose, onCreated }: CreateAssetModalProps) {
  const t = useTranslations('itemsPage.create');
  const tCommon = useTranslations('common.actions');
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
    setTimeout(() => {
      setId('');
      setName('');
      setDescription('');
      setLatitude('');
      setLongitude('');
      setError(null);
    }, 200);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id.trim() || !name.trim()) {
      setError(t('errors.required'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await createAsset({
        id,
        name,
        description,
        latitude: latitude === '' ? null : latitude,
        longitude: longitude === '' ? null : longitude,
      });

      if (!result.success) {
        setError(result.error ?? t('errors.failed'));
        return;
      }

      onCreated();
      close();
    } catch {
      setError(t('errors.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title={t('title')} centered>
      <form onSubmit={submit}>
        <Stack gap="md">
          {error && (
            <Alert color="red" variant="light" icon={<IconAlertTriangleFilled size={16} />}>
              {error}
            </Alert>
          )}

          <TextInput
            label={t('idLabel')}
            description={t('idHelp')}
            value={id}
            onChange={(e) => setId(e.currentTarget.value)}
            data-autofocus
          />
          <TextInput
            label={t('nameLabel')}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <Textarea
            label={t('descriptionLabel')}
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <Group grow>
            <NumberInput
              label={t('latitudeLabel')}
              value={latitude}
              onChange={(value) => setLatitude(typeof value === 'number' ? value : '')}
              decimalScale={6}
              step={0.0001}
              min={-90}
              max={90}
            />
            <NumberInput
              label={t('longitudeLabel')}
              value={longitude}
              onChange={(value) => setLongitude(typeof value === 'number' ? value : '')}
              decimalScale={6}
              step={0.0001}
              min={-180}
              max={180}
            />
          </Group>

          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={close} disabled={saving}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {t('submit')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
