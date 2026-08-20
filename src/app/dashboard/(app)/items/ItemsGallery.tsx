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
import { IconSearch, IconPackage } from '@tabler/icons-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getItems } from '@/actions/items';
import { getCategoriesWithItemCount } from '@/actions/categories';
import PageHeader from '@/components/layout/PageHeader';
import classes from './ItemsGallery.module.css';

interface Item {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  categories: Array<{ id: string; name: string }>;
  states: Array<{ title: string; backed: boolean }>;
}

function ItemCard({ item }: { item: Item }) {
  const t = useTranslations('itemsPage');
  const firstLetter = item.name.charAt(0).toUpperCase();
  const lastState = item.states[0];
  const category = item.categories[0];

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
          {lastState && (
            <Badge
              size="xs"
              variant="light"
              color={lastState.backed ? 'green' : 'yellow'}
              style={{ flexShrink: 0 }}
            >
              {lastState.backed ? t('certified') : t('pending')}
            </Badge>
          )}
        </Group>

        <Text size="xs" c="dimmed" lineClamp={2} style={{ minHeight: '2.4em' }}>
          {item.description || ' '}
        </Text>

        <Text size="xs" c="dimmed" fw={550} tt="uppercase" lts={0.3}>
          {category?.name ?? t('noCategory')}
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

export default function ItemsGallery() {
  const t = useTranslations('itemsPage');
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [data, catResult] = await Promise.all([
        getItems(),
        getCategoriesWithItemCount(),
      ]);
      setItems(data ?? []);
      if (catResult.success) setCategories(catResult.categories ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = items;
    if (categoryFilter) {
      result = result.filter((i) =>
        categoryFilter === '__none__'
          ? !i.categories?.length
          : i.categories?.some((c) => c.id === categoryFilter)
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, categoryFilter, search]);

  const categoryOptions = [
    { value: '', label: t('allCategories') },
    { value: '__none__', label: t('noCategory') },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const hasFilters = Boolean(search.trim() || categoryFilter);
  const clearFilters = () => { setSearch(''); setCategoryFilter(null); };

  return (
    <>
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
            <Select
              data={categoryOptions}
              value={categoryFilter ?? ''}
              onChange={(v) => setCategoryFilter(v || null)}
              w={180}
              clearable={false}
              aria-label={t('allCategories')}
            />
          </Group>
        }
      >
        {!loading && (
          <Text size="sm" c="dimmed" mt="xs">
            {t('count', { count: filtered.length })}
          </Text>
        )}
      </PageHeader>

      {loading ? (
        <GallerySkeleton />
      ) : filtered.length === 0 ? (
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
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </SimpleGrid>
      )}
    </>
  );
}
