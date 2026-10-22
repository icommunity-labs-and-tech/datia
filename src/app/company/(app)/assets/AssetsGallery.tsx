'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  SimpleGrid,
  Grid,
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
  ScrollArea,
  Skeleton,
  ThemeIcon,
  Button,
  Anchor,
} from '@mantine/core';
import { IconPlus, IconSearch, IconPackage, IconMapPin, IconMapPinOff, IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getAssets } from '@/actions/assets';
import PageHeader from '@/components/layout/PageHeader';
import InstallationsMap from '@/components/maps/InstallationsMapLazy';
import { clusterInstallations, type Located } from '@/lib/map/installations';
import BmsSimulatorButton from '@/components/energy/BmsSimulatorButton';
import CreateAssetModal from '@/components/assets/CreateAssetModal';
import EnergySourcesPanel from '@/components/energy/EnergySourcesPanel';
import type { EnergySourceRecord, EnergyConsumptionRecord } from '@/domain/energy/EnergyTypes';
import classes from './AssetsGallery.module.css';

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
      href={`/company/assets/${item.id}`}
      padding={0}
      radius="md"
      className={classes.card}
    >
      {item.imageUrl ? (
        <Image src={item.imageUrl} height={150} alt={item.name} fit="cover" />
      ) : (
        <Center h={150} bg="var(--mantine-color-gray-1)">
          <ThemeIcon color="datiaGreen" variant="light" size={56} radius="xl">
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
 * An installation, as a row in the list that sits beside the map — the two
 * read as one view, not two takes on the same thing: the map says where,
 * this says what's there. Selecting either highlights both, via the same
 * `installationId` the map already keys its own selection off of.
 */
function InstallationRow({
  label,
  count,
  certified,
  energy,
  selected,
  unlocated = false,
  onOpen,
}: {
  label: string;
  count: number;
  certified: number;
  energy?: { capacityKw: number; renewableShare: number | null; sources: unknown[] };
  selected: boolean;
  unlocated?: boolean;
  onOpen: () => void;
}) {
  const t = useTranslations('itemsPage');
  const Icon = unlocated ? IconMapPinOff : IconMapPin;
  return (
    <Anchor
      component="button"
      type="button"
      onClick={onOpen}
      underline="never"
      c="inherit"
      display="block"
      w="100%"
      px={10}
      py={8}
      style={{
        borderRadius: 8,
        textAlign: 'left',
        background: selected ? 'var(--mantine-color-datiaGreen-0)' : 'transparent',
      }}
    >
      <Group gap={8} wrap="nowrap" align="flex-start">
        <ThemeIcon
          variant={selected ? 'filled' : 'light'}
          color={unlocated ? 'gray' : 'datiaGreen'}
          size={30}
          radius="md"
          style={{ flexShrink: 0 }}
        >
          <Icon size={16} stroke={1.8} />
        </ThemeIcon>
        <Stack gap={1} style={{ minWidth: 0 }}>
          <Text fw={600} size="sm" lineClamp={1}>{label}</Text>
          <Text size="xs" c="dimmed">
            {t('installation', { count })}
            {!unlocated && ` · ${t('certifiedRatio', { certified, total: count })}`}
          </Text>
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
      </Group>
    </Anchor>
  );
}

export default function AssetsGallery({
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
      const data = await getAssets();
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

  // Two different sites can share a name ("Malaga", say, twice over) — the
  // map tells them apart by position, but a list needs its own way, or two
  // rows read as one. Numbering the repeats is enough; it doesn't invent a
  // name nobody gave the place.
  const labelFor = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of installations) {
      const base = g.label ?? t('unnamedInstallation');
      counts.set(base, (counts.get(base) ?? 0) + 1);
    }
    const occurrenceSoFar = new Map<string, number>();
    const labels = new Map<string, string>();
    for (const g of installations) {
      const base = g.label ?? t('unnamedInstallation');
      if ((counts.get(base) ?? 0) > 1) {
        const occurrence = (occurrenceSoFar.get(base) ?? 0) + 1;
        occurrenceSoFar.set(base, occurrence);
        labels.set(g.id, `${base} (${occurrence})`);
      } else {
        labels.set(g.id, base);
      }
    }
    return (id: string) => labels.get(id) ?? t('unnamedInstallation');
  }, [installations, t]);

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

      {/* The map is how you browse: installations first, assets inside them. A
          search bypasses it, because looking for a serial should not require
          knowing where it is. Map and list are one view, not two takes on
          the same list — selecting either highlights both, through the same
          installationId. */}
      {!loading && !searching && (installations.length > 0 || unlocated.length > 0) && (
        <Grid gutter="sm" mb="lg">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <InstallationsMap
              installations={installations}
              selectedId={installationId}
              onSelect={setInstallationId}
              height={400}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Paper withBorder radius="md" p={6} h={{ base: 'auto', md: 400 }}>
              <ScrollArea h="100%" type="auto">
                <Stack gap={2}>
                  {installationId && (
                    <Button
                      size="compact-sm"
                      variant="subtle"
                      color="gray"
                      leftSection={<IconArrowLeft size={14} stroke={1.8} />}
                      onClick={() => setInstallationId(null)}
                      style={{ alignSelf: 'flex-start' }}
                    >
                      {t('allInstallations')}
                    </Button>
                  )}
                  {installations.map((g) => (
                    <InstallationRow
                      key={g.id}
                      label={labelFor(g.id)}
                      count={g.members.length}
                      certified={g.members.filter((m) => m.item.certified).length}
                      energy={withEnergy ? energyOf(g.id) : undefined}
                      selected={installationId === g.id}
                      onOpen={() => setInstallationId(installationId === g.id ? null : g.id)}
                    />
                  ))}
                  {unlocated.length > 0 && (
                    <InstallationRow
                      label={t('unlocatedInstallation')}
                      count={unlocated.length}
                      certified={unlocated.filter((i) => i.certified).length}
                      selected={installationId === '__unlocated__'}
                      unlocated
                      onOpen={() =>
                        setInstallationId(installationId === '__unlocated__' ? null : '__unlocated__')
                      }
                    />
                  )}
                </Stack>
              </ScrollArea>
            </Paper>
          </Grid.Col>
        </Grid>
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
