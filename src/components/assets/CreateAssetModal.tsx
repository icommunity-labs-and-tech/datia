'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Group, Modal, NumberInput, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { IconAlertTriangleFilled, IconMapPin, IconSearch } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { createAsset } from '@/actions/assets/createAsset';
import { municipalityAt, searchMunicipality } from '@/actions/assets/locate';
import LocationPicker from '@/components/maps/LocationPickerLazy';

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
 * coordinates the asset stays out of the map and its place. Nobody has
 * coordinates to hand, so they come from a pin on a map — dropped by clicking,
 * or on a municipality found by name — and the number fields stay as an
 * alternative for whoever pastes them from a GPS.
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
  const [place, setPlace] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  const point = latitude !== '' && longitude !== '' ? { lat: latitude, lng: longitude } : null;
  const setPoint = (p: { lat: number; lng: number }) => {
    setLatitude(+p.lat.toFixed(6));
    setLongitude(+p.lng.toFixed(6));
  };

  // The municipality the asset will be grouped under, as the assets page will see it.
  useEffect(() => {
    if (latitude === '' || longitude === '') {
      setPlace(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const m = await municipalityAt(latitude, longitude).catch(() => null);
      if (!cancelled) setPlace(m ? `${m.name} (${m.province})` : t('outsideSpain'));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [latitude, longitude, t]);

  const search = async () => {
    if (!query.trim()) return;
    setSearchError(null);
    const match = await searchMunicipality(query).catch(() => ({ status: 'unknown' as const }));
    if (match.status === 'found') setPoint(match);
    else if (match.status === 'ambiguous') setSearchError(t('searchAmbiguous', { provinces: match.provinces.join(', ') }));
    else setSearchError(t('searchUnknown'));
  };

  const close = () => {
    onClose();
    setTimeout(() => {
      setId('');
      setName('');
      setDescription('');
      setLatitude('');
      setLongitude('');
      setQuery('');
      setSearchError(null);
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
    <Modal opened={opened} onClose={close} title={t('title')} centered size="lg">
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
          <Stack gap={6}>
            <Text size="sm" fw={500}>{t('locationLabel')}</Text>
            <TextInput
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              leftSection={<IconSearch size={15} stroke={1.7} />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={(e) => {
                // Enter searches the map; it must not submit the asset.
                if (e.key === 'Enter') {
                  e.preventDefault();
                  search();
                }
              }}
              error={searchError}
              rightSectionWidth={72}
              rightSection={
                <Button size="compact-xs" variant="subtle" onClick={search}>
                  {t('searchButton')}
                </Button>
              }
            />
            <LocationPicker value={point} onChange={setPoint} />
            <Group gap={6}>
              <IconMapPin size={14} stroke={1.7} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c={point ? undefined : 'dimmed'} data-testid="asset-place">
                {point ? place ?? '…' : t('locationHint')}
              </Text>
            </Group>
          </Stack>
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
