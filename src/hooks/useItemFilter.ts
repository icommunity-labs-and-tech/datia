import { useState, useMemo, useCallback } from 'react';

interface Item {
  id: string;
  name: string;
  categoryId?: string;
  description?: string;
  categories?: { id: string; name: string }[];
  createdAt?: string | Date | null;
  [key: string]: any;
}

interface UseItemFilterOptions {
  searchFields?: (keyof Item)[];
}

export const useItemFilter = (
  items: Item[],
  options: UseItemFilterOptions = {}
) => {
  const { searchFields = ['name', 'categoryId', 'description'] } = options;
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    for (const item of items) {
      for (const cat of item.categories ?? []) {
        if (!seen.has(cat.id)) {
          seen.add(cat.id);
          result.push({ id: cat.id, name: cat.name });
        }
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = searchFields.some((field) => {
          const value = item[field as string];
          return value && String(value).toLowerCase().includes(query);
        });
        if (!matchesSearch) return false;
      }

      if (categoryFilter) {
        const matchesCategory = (item.categories ?? []).some(
          (c: { id: string }) => c.id === categoryFilter
        );
        if (!matchesCategory) return false;
      }

      if (dateFrom || dateTo) {
        const itemDate = item.createdAt ? new Date(item.createdAt) : null;
        if (!itemDate) return false;
        if (dateFrom && itemDate < new Date(dateFrom)) return false;
        if (dateTo && itemDate > new Date(dateTo + 'T23:59:59')) return false;
      }

      return true;
    });
  }, [items, searchQuery, searchFields, categoryFilter, dateFrom, dateTo]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const clearFilters = useCallback(() => {
    setCategoryFilter('');
    setDateFrom('');
    setDateTo('');
  }, []);

  const hasActiveFilters = !!categoryFilter || !!dateFrom || !!dateTo;

  return {
    searchQuery,
    filteredItems,
    handleSearchChange,
    clearSearch,
    categoryFilter,
    setCategoryFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    availableCategories,
    clearFilters,
    hasActiveFilters,
  };
};
