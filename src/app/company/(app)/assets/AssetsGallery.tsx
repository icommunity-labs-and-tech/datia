'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Grid,
  Image,
  Text,
  Badge,
  Group,
  Stack,
  TextInput,
  Center,
  Paper,
  ScrollArea,
  Skeleton,
  ThemeIcon,
  Button,
  CloseButton,
  Anchor,
} from '@mantine/core';
import { IconPlus, IconSearch, IconPackage, IconMapPin, IconMapPinOff, IconShieldCheck } from '@tabler/icons-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getAssets } from '@/actions/assets';
import PageHeader from '@/components/layout/PageHeader';
import InstallationsMap from '@/components/maps/InstallationsMapLazy';
import { groupByMunicipality, type Located } from '@/lib/map/installations';
import BmsSimulatorButton from '@/components/energy/BmsSimulatorButton';
import CreateAssetModal from '@/components/assets/CreateAssetModal';
import EnergySourcesPanel from '@/components/energy/EnergySourcesPanel';
import type { EnergySourceRecord, EnergyConsumptionRecord } from '@/domain/energy/EnergyTypes';
import type { AssetEnergy } from '@/lib/energy/breakdown';

interface Item {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  certified: boolean;
  location?: { lat: number; lng: number } | null;
  municipality?: { name: string; province: string } | null;
}

/** Map and list share one height: they are one view, side by side. */
const PANEL_HEIGHT = 480;

/** An asset, listed under its place beside the map. */
function AssetRow({
  item,
  highlighted,
  onHover,
}: {
  item: Item;
  highlighted: boolean;
  onHover: (id: string | null) => void;
}) {
  const t = useTranslations('itemsPage');
  return (
    <Anchor
      component={Link}
      href={`/company/assets/${item.id}`}
      underline="never"
      c="inherit"
      display="block"
      pl={48}
      pr={10}
      py={6}
      data-asset-row={item.id}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        borderRadius: 8,
        background: highlighted ? 'var(--mantine-color-gray-1)' : 'transparent',
      }}
    >
      <Group gap={10} wrap="nowrap">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt="" w={28} h={28} radius="sm" fit="cover" style={{ flexShrink: 0 }} />
        ) : (
          <ThemeIcon color="gray" variant="light" size={28} radius="sm" style={{ flexShrink: 0 }}>
            <Text fw={700} fz="xs">{item.name.charAt(0).toUpperCase()}</Text>
          </ThemeIcon>
        )}
        <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
          <Text size="sm" fw={500} lineClamp={1}>{item.name}</Text>
          {item.description && (
            <Text size="xs" c="dimmed" lineClamp={1}>{item.description}</Text>
          )}
        </Stack>
        {item.certified && (
          <ThemeIcon color="green" variant="light" size={22} radius="xl" style={{ flexShrink: 0 }} title={t('certified')}>
            <IconShieldCheck size={13} stroke={1.8} />
          </ThemeIcon>
        )}
      </Group>
    </Anchor>
  );
}

function PanelSkeleton() {
  return (
    <Grid gutter="sm">
      <Grid.Col span={{ base: 12, md: 7 }}>
        <Skeleton height={PANEL_HEIGHT} radius="md" />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Skeleton height={PANEL_HEIGHT} radius="md" />
      </Grid.Col>
    </Grid>
  );
}

/**
 * A place, heading its assets in the list beside the map. Selecting it here or
 * on the map does the same thing, through the same `installationId`.
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
  energy?: { kwh: number; renewableShare: number | null };
  selected: boolean;
  unlocated?: boolean;
  onOpen: () => void;
}) {
  const t = useTranslations('itemsPage');
  const locale = useLocale();
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
          {energy && energy.kwh > 0 && (
            <Text size="xs" c="dimmed">
              {t('installationConsumption', {
                consumption:
                  energy.kwh >= 1000
                    ? `${(energy.kwh / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} MWh`
                    : `${energy.kwh.toLocaleString(locale, { maximumFractionDigits: 0 })} kWh`,
              })}
              {energy.renewableShare != null
                ? ` · ${t('renewableShare', { share: energy.renewableShare.toFixed(0) })}`
                : ''}
            </Text>
          )}
        </Stack>
      </Group>
    </Anchor>
  );
}

export default function AssetsGallery({
  simulator = false,
  energyByAsset = {},
  sources = [],
  consumption = [],
}: {
  /** The BMS simulator: a demo tool, only where the organization turns it on. */
  simulator?: boolean;
  /** Every asset's consumption, over all its records. */
  energyByAsset?: Record<string, AssetEnergy>;
  sources?: EnergySourceRecord[];
  consumption?: EnergyConsumptionRecord[];
} = {}) {
  const t = useTranslations('itemsPage');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [installationId, setInstallationId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

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
      i.location ? [{ id: i.id, name: i.name, municipality: i.municipality, ...i.location, item: i }] : []
    );
    return groupByMunicipality(located);
  }, [filtered]);

  const unlocated = useMemo(() => filtered.filter((i) => !i.location), [filtered]);

  // Municipalities come out unique (a shared name carries its province), but
  // groups with no municipality are all "unnamed" — numbering the repeats keeps
  // their rows apart without inventing a name nobody gave the place.
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

  // A place's consumption is its assets', whole — not the latest page of records.
  const energyOf = useCallback(
    (members: Item[]) => {
      const sum = members.reduce(
        (n, m) => {
          const e = energyByAsset[m.id];
          return e
            ? { kwh: n.kwh + e.kwh, declared: n.declared + e.declaredKwh, renewable: n.renewable + e.renewableKwh }
            : n;
        },
        { kwh: 0, declared: 0, renewable: 0 }
      );
      return { kwh: sum.kwh, renewableShare: sum.declared ? (sum.renewable / sum.declared) * 100 : null };
    },
    [energyByAsset]
  );

  // Places, in the order the list shows them: the selected one alone, or all
  // of them with the assets that have no position last.
  const groups = useMemo(() => {
    const all = [
      ...installations.map((g) => ({ id: g.id, items: g.members.map((m) => m.item), unlocated: false })),
      ...(unlocated.length ? [{ id: '__unlocated__', items: unlocated, unlocated: true }] : []),
    ];
    return installationId ? all.filter((g) => g.id === installationId) : all;
  }, [installations, unlocated, installationId]);

  const shownCount = groups.reduce((n, g) => n + g.items.length, 0);
  const hasFilters = Boolean(search.trim() || installationId);
  const clearFilters = () => { setSearch(''); setInstallationId(null); };
  const [creating, setCreating] = useState(false);

  // A dot clicked on the map opens its place and brings its row into view.
  const pickAsset = useCallback(
    (assetId: string) => {
      const group = installations.find((g) => g.members.some((m) => m.id === assetId));
      if (group) setInstallationId(group.id);
      setHighlightedId(assetId);
      requestAnimationFrame(() =>
        document.querySelector(`[data-asset-row="${CSS.escape(assetId)}"]`)?.scrollIntoView({ block: 'nearest' })
      );
    },
    [installations]
  );

  return (
    <>
      <CreateAssetModal opened={creating} onClose={() => setCreating(false)} onCreated={load} />

      <PageHeader
        title={t('title')}
        actions={
          <Group gap="xs" wrap="nowrap">
            <TextInput
              // Plain CSS, not a responsive `w`: Mantine's generated style tag
              // for it did not hydrate.
              style={{ width: 'clamp(160px, 25vw, 240px)' }}
              placeholder={t('searchPlaceholder')}
              leftSection={<IconSearch size={15} stroke={1.7} />}
              value={search}
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setInstallationId(null);
              }}
            />
            <Button leftSection={<IconPlus size={15} stroke={1.9} />} onClick={() => setCreating(true)}>
              {t('create.button')}
            </Button>
            {simulator && <BmsSimulatorButton />}
          </Group>
        }
      >
        {!loading && (
          <Group gap={6} mt="xs">
            <Text size="sm" c="dimmed">{t('count', { count: shownCount })}</Text>
            {installationId && (
              <Badge
                variant="light"
                color="datiaGreen"
                rightSection={
                  <CloseButton
                    size="xs"
                    variant="transparent"
                    c="inherit"
                    aria-label={t('clearInstallation')}
                    onClick={() => setInstallationId(null)}
                  />
                }
              >
                {installationId === '__unlocated__' ? t('unlocatedInstallation') : labelFor(installationId)}
              </Badge>
            )}
          </Group>
        )}
      </PageHeader>

      {loading ? (
        <PanelSkeleton />
      ) : items.length === 0 ? (
        <Paper p={48} radius="md">
          <Center>
            <Stack align="center" gap="sm">
              <ThemeIcon color="gray" variant="light" size={52} radius="xl">
                <IconPackage size={26} stroke={1.5} />
              </ThemeIcon>
              <Text c="dimmed">{t('noItems')}</Text>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <>
          {/* One view of the same places: the map says where, the list what is
              there. Selecting a place on either opens it in the list; hovering
              one of its assets marks it on the map. */}
          <Grid gutter="sm" mb="lg">
            <Grid.Col span={{ base: 12, md: 7 }}>
              <InstallationsMap
                installations={installations}
                selectedId={installationId}
                onSelect={setInstallationId}
                highlightedId={highlightedId}
                onPickAsset={pickAsset}
                height={PANEL_HEIGHT}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Paper withBorder radius="md" p={6} h={{ base: 'auto', md: PANEL_HEIGHT }}>
                {groups.length === 0 ? (
                  <Center h="100%" py="xl">
                    <Stack align="center" gap="sm">
                      <Text size="sm" c="dimmed">{hasFilters ? t('noResults') : t('noItems')}</Text>
                      {hasFilters && (
                        <Button variant="light" size="xs" onClick={clearFilters}>
                          {t('clearFilters')}
                        </Button>
                      )}
                    </Stack>
                  </Center>
                ) : (
                  <ScrollArea h="100%" type="auto">
                    <Stack gap={2}>
                      {groups.map((g) => (
                        <Stack key={g.id} gap={0}>
                          <InstallationRow
                            label={g.unlocated ? t('unlocatedInstallation') : labelFor(g.id)}
                            count={g.items.length}
                            certified={g.items.filter((i) => i.certified).length}
                            energy={energyOf(g.items)}
                            selected={installationId === g.id}
                            unlocated={g.unlocated}
                            onOpen={() => setInstallationId(installationId === g.id ? null : g.id)}
                          />
                          {/* A place's assets show once it is opened; a search
                              only narrows which places and assets there are. */}
                          {installationId === g.id && g.items.map((item) => (
                            <AssetRow
                              key={item.id}
                              item={item}
                              highlighted={highlightedId === item.id}
                              onHover={setHighlightedId}
                            />
                          ))}
                        </Stack>
                      ))}
                    </Stack>
                  </ScrollArea>
                )}
              </Paper>
            </Grid.Col>
          </Grid>

          {installationId && (sourcesByInstallation.get(installationId)?.length ?? 0) > 0 && (
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
        </>
      )}
    </>
  );
}
