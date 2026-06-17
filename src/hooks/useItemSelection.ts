import { useState, useMemo, useCallback, useEffect } from 'react';
import { getItems } from '@/actions/items';

export function useItemSelection() {
  const [items, setItems] = useState<any[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    for (const it of items) {
      for (const cat of (it.categories ?? [])) {
        if (!seen.has(cat.id)) {
          seen.add(cat.id);
          result.push({ id: cat.id, name: cat.name });
        }
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it: any) => {
      const matchesSearch = !q || (
        it.name?.toLowerCase().includes(q) ||
        it.id?.toLowerCase().includes(q) ||
        it.description?.toLowerCase().includes(q)
      );
      const matchesCategory = !categoryFilter ||
        (it.categories ?? []).some((c: any) => c.id === categoryFilter);
      const itemDate = it.createdAt ? new Date(it.createdAt) : null;
      const matchesDateFrom = !dateFrom || (itemDate !== null && itemDate >= new Date(dateFrom));
      const matchesDateTo = !dateTo || (itemDate !== null && itemDate <= new Date(dateTo + 'T23:59:59'));
      return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
    });
  }, [items, search, categoryFilter, dateFrom, dateTo]);

  const toggleItem = useCallback((id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }, []);

  const selectAllFiltered = useCallback(() => {
    const ids = filteredItems.map((it: any) => it.id);
    setSelectedItemIds(Array.from(new Set([...selectedItemIds, ...ids])));
  }, [filteredItems, selectedItemIds]);

  const clearSelection = useCallback(() => {
    setSelectedItemIds([]);
  }, []);

  // Sincroniza la selección con los filtros activos (categoría y fechas).
  // La búsqueda de texto solo afecta la visualización, no la selección.
  useEffect(() => {
    if (items.length === 0) return;
    const filtered = items.filter((it: any) => {
      const matchesCategory = !categoryFilter ||
        (it.categories ?? []).some((c: any) => c.id === categoryFilter);
      const itemDate = it.createdAt ? new Date(it.createdAt) : null;
      const matchesDateFrom = !dateFrom || (itemDate !== null && itemDate >= new Date(dateFrom));
      const matchesDateTo = !dateTo || (itemDate !== null && itemDate <= new Date(dateTo + 'T23:59:59'));
      return matchesCategory && matchesDateFrom && matchesDateTo;
    });
    setSelectedItemIds(filtered.map((it: any) => it.id));
  }, [items, categoryFilter, dateFrom, dateTo]);

  const loadItems = useCallback(async () => {
    try {
      setIsLoadingItems(true);
      const data = await getItems();
      const loadedItems = data || [];
      setItems(loadedItems);
      return loadedItems;
    } catch (e) {
      console.error('Error cargando items', e);
      throw e;
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setSelectedItemIds([]);
    setSearch('');
    setCategoryFilter('');
    setDateFrom('');
    setDateTo('');
  }, []);

  return {
    items,
    selectedItemIds,
    setSelectedItemIds,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    availableCategories,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    isLoadingItems,
    filteredItems,
    selectedCount: selectedItemIds.length,
    toggleItem,
    selectAllFiltered,
    clearSelection,
    loadItems,
    reset,
  };
}

