'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  SimpleGrid,
  Card,
  Image,
  Text,
  Badge,
  Group,
  Stack,
  TextInput,
  Select,
  Center,
  Paper,
  Skeleton,
  ThemeIcon,
  Button,
} from '@mantine/core';
import { IconPlus, IconSearch, IconPackage, IconMapPin, IconMapPinOff, IconX } from '@tabler/icons-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getItems } from '@/actions/items';
import PageHeader from '@/components/layout/PageHeader';
import InstallationsMap from '@/components/maps/InstallationsMapLazy';
import { clusterInstallations, type Located } from '@/lib/map/installations';
import BmsSimulatorButton from '@/components/energy/BmsSimulatorButton';
import CreateAssetModal from '@/components/assets/CreateAssetModal';
import EnergySourcesPanel from '@/components/energy/EnergySourcesPanel';
import type { EnergySourceRecord, EnergyConsumptionRecord } from '@/domain/energy/EnergyTypes';
import classes from './ItemsGallery.module.css';

interface Item {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  certified: boolean;
  location?: { lat: number; lng: number } | null;
  siteName?: string | null;
}

function ItemCard({ item }: { item: Item }) {
  const t = useTranslations('itemsPage');
  const firstLetter = item.name.charAt(0).toUpperCase();

  return (
    <Card
      component={Link}
      href={`/dashboard/items/${item.id}`}
      padding={0}
      radius="md"
      className={classes.card}
    >
      {item.imageUrl ? (
        <Image src={item.imageUrl} height={150} alt={item.name} fit="cover" />
      ) : (
        <Center h={150} bg="var(--mantine-color-gray-1)">
          <ThemeIcon color="datiaBlue" variant="light" size={56} radius="xl">
            <Text fw={700} fz="xl">{firstLetter}</Text>
          </ThemeIcon>
        </Center>
      )}

      <Stack gap={8} p="md">
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Text fw={600} size="sm" lineClamp={1}>{item.name}</Text>
          {item.certified && (
            <Badge size="xs" variant="light" color="green" style={{ flexShrink: 0 }}>
              {t('certified')}
            </Badge>
          )}
        </Group>

        <Text size="xs" c="dimmed" lineClamp={2} style={{ minHeight: '2.4em' }}>
          {item.description || ' '}
        </Text>
      </Stack>
    </Card>
  );
}

function GallerySkeleton() {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} padding={0} radius="md">
          <Skeleton height={150} radius={0} />
          <Stack gap={8} p="md">
            <Skeleton height={12} width="70%" radius="sm" />
            <Skeleton height={10} radius="sm" />
            <Skeleton height={10} width="40%" radius="sm" />
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}

/**
 * An installation, as a way in. The default view lists these rather than every
 * asset at once: opening the page on a wall of near-identical cards is exactly
 * the browsing problem the map was meant to solve.
 */
function InstallationCard({
  label,
  count,
  certified,
  energy,
  onOpen,
}: {
  label: string;
  count: number;
  certified: number;
  energy?: { capacityKw: number; renewableShare: number | null; sources: unknown[] };
  onOpen: () => void;
}) {
  const t = useTranslations('itemsPage');
  return (
    <Card withBorder padding="md" radius="md" onClick={onOpen} style={{ cursor: 'pointer' }}>
      <Stack gap={8}>
        <Group gap={8} wrap="nowrap">
          <ThemeIcon variant="light" size={34} radius="md">
            <IconMapPin size={18} stroke={1.7} />
          </ThemeIcon>
          <Text fw={600} lineClamp={2}>{label}</Text>
        </Group>
        <Text size="sm" c="dimmed">{t('installation', { count })}</Text>
        <Text size="xs" c="dimmed">{t('certifiedRatio', { certified, total: count })}</Text>
        {energy && energy.sources.length > 0 && (
          <Text size="xs" c="dimmed">
            {t('installationEnergy', {
              sources: energy.sources.length,
              capacity:
                energy.capacityKw >= 1000
                  ? `${(energy.capacityKw / 1000).toFixed(1)} MW`
                  : `${energy.capacityKw.toFixed(0)} kW`,
            })}
            {energy.renewableShare != null ? ` · ${energy.renewableShare.toFixed(0)}% renovable` : ''}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

export default function ItemsGallery({
  withEnergy = false,
  sources = [],
  consumption = [],
}: {
  withEnergy?: boolean;
  sources?: EnergySourceRecord[];
  consumption?: EnergyConsumptionRecord[];
} = {}) {
  const t = useTranslations('itemsPage');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [installationId, setInstallationId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getItems();
      setItems(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, search]);

  // Installations are derived from where the assets are, not declared: the map
  // discovers them, so an asset that moves changes installation on its own.
  const installations = useMemo(() => {
    const located: Array<Located & { item: Item }> = filtered.flatMap((i) =>
      i.location ? [{ id: i.id, name: i.name, siteName: i.siteName, ...i.location, item: i }] : []
    );
    return clusterInstallations(located);
  }, [filtered]);

  const unlocated = useMemo(() => filtered.filter((i) => !i.location), [filtered]);

  // A source belongs to an asset, so it belongs to whichever installation that
  // asset sits in. This is also what rescues sources with no coordinates of
  // their own: they inherit their asset's place instead of vanishing.
  const sourcesByInstallation = useMemo(() => {
    const byItem = new Map<string, EnergySourceRecord[]>();
    for (const s of sources) {
      const list = byItem.get(s.assetId) ?? [];
      list.push(s);
      byItem.set(s.assetId, list);
    }
    const result = new Map<string, EnergySourceRecord[]>();
    for (const g of installations) {
      result.set(g.id, g.members.flatMap((m) => byItem.get(m.id) ?? []));
    }
    result.set(
      '__unlocated__',
      unlocated.flatMap((i) => byItem.get(i.id) ?? [])
    );
    return result;
  }, [sources, installations, unlocated]);

  const energyOf = useCallback(
    (installationId: string) => {
      const list = sourcesByInstallation.get(installationId) ?? [];
      const capacityKw = list.reduce((s, r) => s + (r.capacityKw ?? 0), 0);
      const withShare = list.filter((r) => r.renewableShare != null);
      return {
        sources: list,
        capacityKw,
        renewableShare: withShare.length
          ? withShare.reduce((s, r) => s + r.renewableShare!, 0) / withShare.length
          : null,
      };
    },
    [sourcesByInstallation]
  );

  const searching = Boolean(search.trim());

  // A search looks everywhere: finding a serial should never depend on knowing
  // which site it sits at. Browsing, on the other hand, goes through the map.
  const shown = useMemo(() => {
    if (searching || !installationId) return filtered;
    if (installationId === '__unlocated__') return unlocated;
    const hit = installations.find((g) => g.id === installationId);
    return hit ? hit.members.map((m) => m.item) : filtered;
  }, [searching, installationId, installations, unlocated, filtered]);

  const hasFilters = Boolean(search.trim() || installationId);
  const clearFilters = () => { setSearch(''); setInstallationId(null); };
  const [creating, setCreating] = useState(false);

  return (
    <>
      <CreateAssetModal opened={creating} onClose={() => setCreating(false)} onCreated={load} />

      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Group gap="xs" wrap="nowrap">
            <TextInput
              w={{ base: 160, sm: 240 }}
              placeholder={t('searchPlaceholder')}
              leftSection={<IconSearch size={15} stroke={1.7} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
            <Button leftSection={<IconPlus size={15} stroke={1.9} />} onClick={() => setCreating(true)}>
              {t('create.button')}
            </Button>
            {withEnergy && <BmsSimulatorButton />}
          </Group>
        }
      >
        {!loading && (
          <Text size="sm" c="dimmed" mt="xs">
            {t('count', { count: shown.length })}
          </Text>
        )}
      </PageHeader>

      {/* The map is how you browse: installations first, assets inside them.
          A search bypasses it, because looking for a serial should not require
          knowing where it is. */}
      {!loading && !searching && (installations.length > 0 || unlocated.length > 0) && (
        <Stack gap="sm" mb="lg">
          <InstallationsMap
            installations={installations}
            selectedId={installationId}
            onSelect={setInstallationId}
            height={360}
          />
          <Group gap="xs">
            {installations.map((g) => (
              <Button
                key={g.id}
                size="compact-sm"
                variant={installationId === g.id ? 'filled' : 'light'}
                leftSection={<IconMapPin size={13} stroke={1.8} />}
                onClick={() => setInstallationId(installationId === g.id ? null : g.id)}
              >
                {t('installation', { count: g.members.length })}
              </Button>
            ))}
            {unlocated.length > 0 && (
              <Button
                size="compact-sm"
                color="gray"
                variant={installationId === '__unlocated__' ? 'filled' : 'light'}
                leftSection={<IconMapPinOff size={13} stroke={1.8} />}
                onClick={() =>
                  setInstallationId(installationId === '__unlocated__' ? null : '__unlocated__')
                }
              >
                {t('unlocated', { count: unlocated.length })}
              </Button>
            )}
            {installationId && (
              <Button
                size="compact-sm"
                variant="subtle"
                color="gray"
                leftSection={<IconX size={13} stroke={1.8} />}
                onClick={() => setInstallationId(null)}
              >
                {t('allInstallations')}
              </Button>
            )}
          </Group>
        </Stack>
      )}

      {/* Nothing selected and nothing searched: show the installations, not
          every asset in the organisation. */}
      {!loading && !searching && !installationId && (installations.length > 0 || unlocated.length > 0) && (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
          {installations.map((g) => (
            <InstallationCard
              key={g.id}
              label={g.label ?? t('unnamedInstallation')}
              count={g.members.length}
              certified={g.members.filter((m) => m.item.certified).length}
              energy={withEnergy ? energyOf(g.id) : undefined}
              onOpen={() => setInstallationId(g.id)}
            />
          ))}
          {unlocated.length > 0 && (
            <InstallationCard
              label={t('unlocatedInstallation')}
              count={unlocated.length}
              certified={unlocated.filter((i) => i.certified).length}
              onOpen={() => setInstallationId('__unlocated__')}
            />
          )}
        </SimpleGrid>
      )}

      {loading ? (
        <GallerySkeleton />
      ) : !searching && !installationId ? null : shown.length === 0 ? (
        <Paper p={48} radius="md">
          <Center>
            <Stack align="center" gap="sm">
              <ThemeIcon color="gray" variant="light" size={52} radius="xl">
                <IconPackage size={26} stroke={1.5} />
              </ThemeIcon>
              <Text c="dimmed">{hasFilters ? t('noResults') : t('noItems')}</Text>
              {hasFilters && (
                <Button variant="light" size="xs" onClick={clearFilters}>
                  {t('clearFilters')}
                </Button>
              )}
            </Stack>
          </Center>
        </Paper>
      ) : (
        <>
        {withEnergy && installationId && !searching && (
          <Stack gap="xs" mb="lg">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts={0.4}>
              {t('installationSources')}
            </Text>
            <EnergySourcesPanel
              sources={sourcesByInstallation.get(installationId) ?? []}
              consumption={consumption}
            />
          </Stack>
        )}
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
          {shown.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </SimpleGrid>
        </>
      )}
    </>
  );
}
