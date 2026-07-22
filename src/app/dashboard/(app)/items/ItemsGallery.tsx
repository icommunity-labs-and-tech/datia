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
  Loader,
  Paper,
  Avatar,
  ThemeIcon,
  Anchor,
} from '@mantine/core';
import { IconSearch, IconPackage } from '@tabler/icons-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getItems } from '@/actions/items';
import { getCategoriesWithItemCount } from '@/actions/categories';

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
      withBorder
      padding="sm"
      radius="md"
      style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
    >
      {item.imageUrl ? (
        <Card.Section>
          <Image src={item.imageUrl} height={140} alt={item.name} fit="cover" />
        </Card.Section>
      ) : (
        <Card.Section>
          <Center h={140} bg="var(--mantine-color-default-hover)">
            <ThemeIcon color="datiaBlue" variant="light" size={64} radius="xl">
              <Text fw={700} fz="xl">{firstLetter}</Text>
            </ThemeIcon>
          </Center>
        </Card.Section>
      )}

      <Stack gap={6} mt="sm">
        <Text fw={600} size="sm" lineClamp={1}>{item.name}</Text>

        <Group gap={4}>
          <Badge size="xs" color="datiaBlue" variant="light">
            {category?.name ?? t('noCategory')}
          </Badge>
          {lastState && (
            <Badge
              size="xs"
              color={lastState.backed ? 'green' : 'yellow'}
              variant="dot"
            >
              {lastState.backed ? t('certified') : t('pending')}
            </Badge>
          )}
        </Group>

        {item.description && (
          <Text size="xs" c="dimmed" lineClamp={2}>{item.description}</Text>
        )}
      </Stack>
    </Card>
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

  if (loading) {
    return (
      <Center h={240}>
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group>
        <TextInput
          flex={1}
          placeholder={t('searchPlaceholder')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <Select
          data={categoryOptions}
          value={categoryFilter ?? ''}
          onChange={(v) => setCategoryFilter(v || null)}
          style={{ width: 200 }}
          clearable={false}
        />
      </Group>

      {filtered.length === 0 ? (
        <Paper withBorder p="xl" radius="md">
          <Center>
            <Stack align="center" gap="xs">
              <ThemeIcon color="gray" variant="light" size={48} radius="xl">
                <IconPackage size={24} />
              </ThemeIcon>
              <Text c="dimmed">{t('noItems')}</Text>
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
    </Stack>
  );
}
