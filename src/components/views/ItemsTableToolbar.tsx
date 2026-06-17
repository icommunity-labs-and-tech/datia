import React from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import { useTranslations } from 'next-intl';
import type { TableAction } from '@/components/GenericTable/types';
import './ItemsTableToolbar.css';

export interface ItemsTableToolbarProps {
  icon?: string;
  title?: string;
  filter: string;
  onFilterChange: (value: string) => void;
  selectedRow: Record<string, any> | null;
  actions?: TableAction[];
  onActionClick: (action: TableAction) => void;
  showAddButton: boolean;
  onAddClick: () => void;
  filterPlaceholder?: string;
  addButtonLabel?: string;
  className?: string;
  filterType: 'name' | 'id' | 'category';
  onFilterTypeChange: (type: 'name' | 'id' | 'category') => void;
  onExportCsvClick?: () => void;
  exportCsvLabel?: string;
}

export default function ItemsTableToolbar({
  icon,
  title,
  filter,
  onFilterChange,
  selectedRow,
  actions,
  onActionClick,
  showAddButton,
  onAddClick,
  filterPlaceholder = "Filtrar...",
  addButtonLabel = "Añadir",
  className = "",
  filterType,
  onFilterTypeChange,
  onExportCsvClick,
  exportCsvLabel = "Exportar CSV"
}: ItemsTableToolbarProps) {
  const t = useTranslations('tables');
  return (
    <div className={`table-toolbar ${className}`}>
      <div className="title-section">
        {icon && <i className={`bi ${icon}`} />}
        {title && <h4>{title}</h4>}
      </div>
      <div className="controls-section" role="search" aria-label={t('searchTable')}>
        <div className="input-group">
          <select
            className="form-select"
            value={filterType}
            onChange={(e) => onFilterTypeChange(e.target.value as 'name' | 'id' | 'category')}
            style={{ maxWidth: '120px' }}
          >
            <option value="name">{t('filterType.name')}</option>
            <option value="id">{t('filterType.id')}</option>
            <option value="category">{t('filterType.category')}</option>
          </select>
          <Form.Control
            type="text"
            placeholder={filterPlaceholder}
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            aria-label={filterPlaceholder}
          />
        </div>
        {selectedRow && actions?.length ? (
          <Dropdown align="end">
            <Dropdown.Toggle variant="secondary">{t('columns.actions')}</Dropdown.Toggle>
            <Dropdown.Menu>
              {actions.map((action, index) => (
                <Dropdown.Item key={index} onClick={() => onActionClick(action)}>
                  {action.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        ) : null}
        {onExportCsvClick && (
          <Button variant="outline-primary" onClick={onExportCsvClick} title={exportCsvLabel}>
            <i className="bi bi-filetype-csv me-1" />
            <span className="d-none d-lg-inline">{exportCsvLabel}</span>
          </Button>
        )}
        {showAddButton && (
          <Button variant="primary" onClick={onAddClick}>
            <span className="d-none d-md-inline">{addButtonLabel}</span>
            <span className="d-md-none">+</span>
          </Button>
        )}
      </div>
    </div>
  );
}
