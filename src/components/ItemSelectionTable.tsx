'use client';

import { useTranslations } from 'next-intl';
import { useRef, useEffect } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

interface Item {
  id: string;
  name: string;
  description?: string | null;
  categories?: { id: string; name: string }[];
  createdAt?: string | Date | null;
}

interface ItemSelectionTableProps {
  items: Item[];
  selectedItemIds: string[];
  onToggleItem: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  availableCategories: { id: string; name: string }[];
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  selectedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  tableHeight?: number;
}

function SelectAllHeader({
  items,
  selectedItemIds,
  onSelectAll,
  onClearSelection,
}: {
  items: { id: string }[];
  selectedItemIds: string[];
  onSelectAll: () => void;
  onClearSelection: () => void;
}) {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const selectedCount = items.filter(it => selectedItemIds.includes(it.id)).length;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const someSelected = selectedCount > 0 && selectedCount < items.length;

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <th style={{ width: 40 }}>
      <input
        ref={checkboxRef}
        type="checkbox"
        className="form-check-input"
        checked={allSelected}
        onChange={() => allSelected ? onClearSelection() : onSelectAll()}
        title={allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
      />
    </th>
  );
}

export default function ItemSelectionTable({
  items,
  selectedItemIds,
  onToggleItem,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  availableCategories,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  selectedCount,
  onSelectAll,
  onClearSelection,
  tableHeight = 400,
}: ItemSelectionTableProps) {
  const t = useTranslations('common');
  return (
    <>
      <div className="row g-2 mb-3">
        <div className="col-12 col-sm-7">
          <Form.Label className="small text-muted mb-1">Buscar</Form.Label>
          <Form.Control
            size="sm"
            type="text"
            placeholder="Nombre, ID o descripción"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        <div className="col-12 col-sm-5">
          <Form.Label className="small text-muted mb-1">Categoría</Form.Label>
          <Form.Select
            size="sm"
            value={categoryFilter}
            onChange={e => onCategoryFilterChange(e.target.value)}
          >
            <option value="">Todas</option>
            {availableCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </Form.Select>
        </div>
        <div className="col-6 col-sm-4">
          <Form.Label className="small text-muted mb-1">Fecha desde</Form.Label>
          <Form.Control
            size="sm"
            type="date"
            value={dateFrom}
            onChange={e => onDateFromChange(e.target.value)}
          />
        </div>
        <div className="col-6 col-sm-4">
          <Form.Label className="small text-muted mb-1">Fecha hasta</Form.Label>
          <div className="d-flex align-items-center gap-1">
            <Form.Control
              size="sm"
              type="date"
              value={dateTo}
              onChange={e => onDateToChange(e.target.value)}
            />
            {(dateFrom || dateTo) && (
              <Button
                variant="link"
                size="sm"
                className="p-0 text-muted flex-shrink-0"
                onClick={() => { onDateFromChange(''); onDateToChange(''); }}
                title="Limpiar fechas"
              >
                <i className="bi bi-x-lg" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="small text-muted mb-2">
        {items.length} productos encontrados · {selectedCount} seleccionados
      </div>
      <div
        style={{
          maxHeight: tableHeight,
          overflowY: 'auto',
          overflowX: 'auto',
          border: '1px solid #eee',
          borderRadius: 4,
        }}
      >
        <table className="table table-sm mb-0">
          <thead>
            <tr>
              <SelectAllHeader
                items={items}
                selectedItemIds={selectedItemIds}
                onSelectAll={onSelectAll}
                onClearSelection={onClearSelection}
              />
              <th>Nombre</th>
              <th>ID</th>
              <th>Categorías</th>
              <th>Fecha creación</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>
                  <Form.Check
                    type="checkbox"
                    checked={selectedItemIds.includes(it.id)}
                    onChange={() => onToggleItem(it.id)}
                  />
                </td>
                <td>{it.name}</td>
                <td className="text-muted small">{it.id}</td>
                <td className="text-truncate" style={{ maxWidth: 140 }}>
                  <span title={(it.categories ?? []).map(c => c.name).join(', ')}>
                    {(it.categories ?? []).length > 0
                      ? (it.categories ?? []).map(c => c.name).join(', ')
                      : <span className="text-muted">—</span>}
                  </span>
                </td>
                <td className="text-muted small text-nowrap">
                  {it.createdAt ? new Date(it.createdAt).toLocaleDateString() : '—'}
                </td>
                <td className="text-truncate" style={{ maxWidth: 180 }}>
                  <span title={it.description || ''}>
                    {it.description || <span className="text-muted">{t('noDescription')}</span>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

