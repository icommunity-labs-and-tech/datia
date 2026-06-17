import { useMemo, useState, useCallback } from 'react';

export function useTableFilter<TRow extends Record<string, any>>(allRows: TRow[], initialPageSize: number = 5) {
  const [filter, setFilter] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filteredData = useMemo(() => {
    const lowered = filter.toLowerCase();
    if (!lowered) return allRows;
    return allRows.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(lowered))
    );
  }, [allRows, filter]);

  const pageCount = Math.ceil(filteredData.length / pageSize);

  const handleFilterChange = useCallback((value: string) => {
    setFilter(value);
    setPageIndex(0); // Reset a la primera página cuando cambia el filtro
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPageIndex(0); // Reset a la primera página cuando cambia el tamaño
  }, []);

  const setPageIndexSafe = useCallback((index: number) => {
    // Asegurar que el índice esté dentro de los límites válidos
    const maxIndex = Math.max(0, pageCount - 1);
    setPageIndex(Math.max(0, Math.min(index, maxIndex)));
  }, [pageCount]);

  return {
    filter,
    setFilter,
    pageIndex,
    setPageIndex: setPageIndexSafe,
    pageSize,
    setPageSize: handlePageSizeChange,
    filteredData,
    pageCount,
    totalItems: allRows.length,
    handleFilterChange,
  } as const;
}


