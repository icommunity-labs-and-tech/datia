'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Spinner } from 'react-bootstrap';
import { useTranslations } from 'next-intl';
import Box from '@/components/Box';
import { Divider } from '@/components/Divider';
import ItemsStatsPanel, { CATEGORY_NONE } from '@/components/charts/ItemsStatsPanel';
import { ItemsTable } from '@/components/views';
import { getItems } from '@/actions/items';

export default function ItemsPageClient() {
  const t = useTranslations('itemsPage.charts');
  const tTables = useTranslations('tables');

  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getItems();
      setAllItems(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === CATEGORY_NONE) return allItems.filter(i => !i.categories?.length);
    if (categoryFilter !== null) return allItems.filter(i => i.categories?.some((c: any) => c.id === categoryFilter));
    return allItems;
  }, [allItems, categoryFilter]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center mb-4" style={{ height: 180 }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Box>
        <h6 className="mb-2">{tTables('whatIsInventory')}</h6>
        <Divider />
        <p className="mb-0 text-muted">{tTables('inventoryDescription')}</p>
      </Box>

      <ItemsStatsPanel
        allItems={allItems}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
      />

      <ItemsTable
        showBox={true}
        showDescription={false}
        externalData={filteredItems}
        onDataChange={load}
      />
    </>
  );
}
