import { flexRender } from '@tanstack/react-table';
import { useRef, useState } from 'react';
import type { RowAction } from './types';

type Props = {
  table: any;
  selectedRow: Record<string, any> | null;
  setSelectedRow: (row: Record<string, any> | null) => void;
  lastAddedId: string | null;
  onRowDoubleClick?: (row: Record<string, any>) => void;
  rowActions?: RowAction[];
};

function CopyButton({ tdRef }: { tdRef: React.RefObject<HTMLTableCellElement | null> }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const inner = tdRef.current?.querySelector('.cell-inner');
    const text = (inner as HTMLElement)?.innerText?.trim() ?? '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      className={`copy-cell-btn${copied ? ' copied' : ''}`}
      onClick={handleCopy}
      title={copied ? '¡Copiado!' : 'Copiar'}
    >
      <i className={`bi ${copied ? 'bi-check-lg' : 'bi-copy'}`} />
    </button>
  );
}

function DataCell({ cell, isLast, rowActions, row }: {
  cell: any;
  isLast: boolean;
  rowActions?: RowAction[];
  row: any;
}) {
  const tdRef = useRef<HTMLTableCellElement>(null);

  return (
    <td
      ref={tdRef}
      className={isLast ? undefined : 'data-cell'}
      style={isLast ? { position: 'relative', overflow: 'visible' } : undefined}
    >
      <div className="cell-inner">
        {flexRender(cell.column.columnDef.cell, cell.getContext())}
      </div>
      {!isLast && <CopyButton tdRef={tdRef} />}
      {isLast && (
        <div className="row-hover-actions">
          {rowActions!.map((action, i) => (
            <button
              key={i}
              className={`btn btn-${action.variant || 'outline-secondary'} btn-sm`}
              onClick={(e) => { e.stopPropagation(); action.onClick(row.original); }}
              title={action.label}
            >
              {action.icon && <i className={`bi ${action.icon}`}></i>}
            </button>
          ))}
        </div>
      )}
    </td>
  );
}

export default function DataTable({
  table,
  selectedRow,
  setSelectedRow,
  lastAddedId,
  onRowDoubleClick,
  rowActions,
}: Props) {
  const lastClickRef = useRef<{ time: number; rowId: string } | null>(null);
  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;

  return (
    <table className="custom-table mb-0 table-hover">
      <thead>
        {headerGroups.map((headerGroup: any) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header: any) => {
              const canSort = header.column.getCanSort?.() ?? true;
              const sortDir = header.column.getIsSorted?.();
              const indicator = sortDir === 'asc' ?
                <i className="bi bi-arrow-up ms-1"></i> :
                sortDir === 'desc' ?
                <i className="bi bi-arrow-down ms-1"></i> :
                <i className="bi bi-arrow-up-down ms-1 text-muted" style={{opacity: 0.5}}></i>;
              return (
                <th
                  key={header.id}
                  onClick={canSort ? header.column.getToggleSortingHandler?.() : undefined}
                  style={{ cursor: canSort ? 'pointer' : 'default', userSelect: 'none' }}
                  className={canSort ? 'sortable-column' : ''}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {canSort && indicator}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {rows.map((row: any) => {
          const rowId = row.original.id;
          const isSelected = selectedRow?.id === rowId;
          const isNewlyAdded = rowId === lastAddedId;
          const className = isSelected ? 'table-active' : isNewlyAdded ? 'table-success' : '';

          return (
            <tr
              key={row.id}
              className={className}
              onClick={(e) => {
                if (e.target instanceof HTMLElement && e.target.closest('[data-image-clickable]')) {
                  return;
                }
                if (onRowDoubleClick) {
                  const now = Date.now();
                  const last = lastClickRef.current;
                  if (last && last.rowId === String(rowId) && now - last.time < 300) {
                    lastClickRef.current = null;
                    onRowDoubleClick(row.original);
                    return;
                  }
                  lastClickRef.current = { time: now, rowId: String(rowId) };
                }
                setSelectedRow(isSelected ? null : row.original);
              }}
              style={{ cursor: onRowDoubleClick ? 'pointer' : 'default' }}
              title={onRowDoubleClick ? 'Doble clic para ver detalles' : undefined}
            >
              {row.getVisibleCells().map((cell: any, idx: number, arr: any[]) => {
                const isLast = idx === arr.length - 1 && !!rowActions?.length;
                return (
                  <DataCell
                    key={cell.id}
                    cell={cell}
                    isLast={isLast}
                    rowActions={rowActions}
                    row={row}
                  />
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
