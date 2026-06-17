import React from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import type { TableAction } from '../types';
import './Toolbar.css';

export interface ToolbarProps {
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
}

export default function Toolbar({
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
  className = ""
}: ToolbarProps) {
  return (
    <div className={`table-toolbar ${className}`}>
      <div className="title-section">
        {icon && <i className={`bi ${icon}`} />}
        {title && <h4>{title}</h4>}
      </div>
      <div className="controls-section" role="search" aria-label="Buscar en la tabla">
        <Form.Control
          type="text"
          placeholder={filterPlaceholder}
          className="w-auto"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          aria-label={filterPlaceholder}
        />
        {selectedRow && actions?.length ? (
          <Dropdown align="end">
            <Dropdown.Toggle variant="secondary">Acciones</Dropdown.Toggle>
            <Dropdown.Menu>
              {actions.map((action, index) => (
                <Dropdown.Item key={index} onClick={() => onActionClick(action)}>
                  {action.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        ) : null}
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
