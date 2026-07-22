import React from 'react';
import { Button, Menu, TextInput } from '@mantine/core';
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
        <TextInput
          placeholder={filterPlaceholder}
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          aria-label={filterPlaceholder}
          size="sm"
        />
        {selectedRow && actions?.length ? (
          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <Button variant="default" size="sm">Acciones</Button>
            </Menu.Target>
            <Menu.Dropdown>
              {actions.map((action, index) => (
                <Menu.Item key={index} onClick={() => onActionClick(action)}>
                  {action.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        ) : null}
        {showAddButton && (
          <Button size="sm" onClick={onAddClick}>
            {addButtonLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
