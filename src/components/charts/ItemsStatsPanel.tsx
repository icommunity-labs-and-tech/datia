'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import StatsPanel, { type StatCard, type PieEntry } from './StatsPanel';

export const CATEGORY_NONE = '__none__';
const CATEGORY_OTHERS = '__others__';
const MAX_PIE_SLICES = 6;

const CATEGORY_COLORS = ['#0d6efd', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#0dcaf0'];

interface Props {
  allItems: any[];
  categoryFilter: string | null;
  onCategoryFilterChange: (cat: string | null) => void;
}

export default function ItemsStatsPanel({ allItems, categoryFilter, onCategoryFilterChange }: Props) {
  const t = useTranslations('itemsPage.charts');

  const withCategory = useMemo(() => allItems.filter(i => i.categories?.length > 0).length, [allItems]);
  const withoutCategory = useMemo(() => allItems.length - withCategory, [allItems, withCategory]);
  const withImage = useMemo(() => allItems.filter(i => i.imageUrl).length, [allItems]);

  const statCards: StatCard[] = [
    { color: '#0d6efd', value: allItems.length, label: t('total'), active: categoryFilter === null, onClick: () => onCategoryFilterChange(null) },
    { color: '#22c55e', value: withCategory, label: t('withCategory'), active: false },
    { color: '#f59e0b', value: withoutCategory, label: t('uncategorized'), active: categoryFilter === CATEGORY_NONE, onClick: () => onCategoryFilterChange(categoryFilter === CATEGORY_NONE ? null : CATEGORY_NONE) },
    { color: '#64748b', value: withImage, label: t('withImage'), active: false },
  ];

  const pieData: PieEntry[] = useMemo(() => {
    const map = new Map<string, { name: string; count: number; color: string }>();
    let colorIdx = 0;
    allItems.forEach(item => {
      if (!item.categories?.length) {
        const existing = map.get(CATEGORY_NONE);
        if (existing) existing.count++;
        else map.set(CATEGORY_NONE, { name: t('uncategorized'), count: 1, color: '#94a3b8' });
      } else {
        item.categories.forEach((cat: { id: string; name: string }) => {
          const existing = map.get(cat.id);
          if (existing) {
            existing.count++;
          } else {
            map.set(cat.id, { name: cat.name, count: 1, color: CATEGORY_COLORS[colorIdx++ % CATEGORY_COLORS.length] });
          }
        });
      }
    });
    const sorted = Array.from(map.entries())
      .map(([key, { name, count, color }]) => ({ key, value: count, name, color }))
      .sort((a, b) => b.value - a.value);

    const top = sorted.slice(0, MAX_PIE_SLICES);
    const rest = sorted.slice(MAX_PIE_SLICES);
    const othersCount = rest.reduce((s, r) => s + r.value, 0);

    if (othersCount > 0) {
      top.push({ key: CATEGORY_OTHERS, value: othersCount, name: t('others'), color: '#94a3b8' });
    }

    return top;
  }, [allItems, t]);

  if (allItems.length === 0) return null;

  return (
    <StatsPanel
      title={t('statsTitle')}
      statCards={statCards}
      pie={{
        title: t('categoryDistribution'),
        data: pieData,
        selectedKey: categoryFilter,
        onSelect: onCategoryFilterChange,
        clearLabel: t('allCategories'),
      }}
    />
  );
}
