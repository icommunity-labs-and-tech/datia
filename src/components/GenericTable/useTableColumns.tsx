import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { formatValueWithSmartDateDetection, truncateText } from '@/lib/format';
import type { CustomColumn } from './types';

export function useTableColumns(rows: Record<string, any>[], customColumns: CustomColumn[]) {
  const columnHelper = createColumnHelper<Record<string, any>>();

  return useMemo(() => {
    const baseColumns = Object.keys(rows[0] || {}).map((key) => {
      // Buscar si hay un preset que defina si esta columna es ordenable
      const presetColumn = customColumns.find(col => col.key === key);
      const isSortable = presetColumn?.enableSorting !== false;
      
      return columnHelper.accessor(key, {
        header: key.charAt(0).toUpperCase() + key.slice(1),
        enableSorting: isSortable,
        sortingFn: isSortable ? (a, b) => {
          const va = a.getValue(key) as unknown as string;
          const vb = b.getValue(key) as unknown as string;
          const da = new Date(va as string);
          const db = new Date(vb as string);
          const isDate = !isNaN(da.getTime()) && !isNaN(db.getTime());
          if (isDate) return da.getTime() - db.getTime();
          return String(va).localeCompare(String(vb));
        } : undefined,
        cell: (info) => {
          const value = info.getValue();
          const raw = String(value);
          const formatted = formatValueWithSmartDateDetection(value, key);

          const isDateField = (() => {
            const lowered = key.toLowerCase();
            if (lowered.includes('date') || lowered.includes('created') || lowered.includes('updated')) return true;
            if (value instanceof Date) return true;
            if (typeof value === 'string') {
              const d = new Date(value);
              if (!isNaN(d.getTime())) return true;
            }
            return false;
          })();

          const displayValue = isDateField ? formatted : truncateText(formatted, 12);
          return <span title={raw}>{displayValue}</span>;
        },
      });
    });

    const customCols = customColumns.map((customCol) =>
      columnHelper.accessor((row) => row[customCol.key], {
        id: customCol.key,
        header: customCol.label,
        enableSorting: customCol.enableSorting !== false,
        sortingFn: customCol.sortingFn || ((a, b) => {
          const aValue = a.getValue(customCol.key);
          const bValue = b.getValue(customCol.key);
          return String(aValue).localeCompare(String(bValue));
        }),
        cell: (info) => customCol.render(info.row.original),
      })
    );

    return customCols.length > 0 ? customCols : baseColumns;
  }, [rows, customColumns, columnHelper]);
}


