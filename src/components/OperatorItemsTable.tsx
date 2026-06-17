'use client';

import React from 'react';
import { Table } from 'react-bootstrap';
import { useTranslations } from 'next-intl';
import { formatValueWithSmartDateDetection } from '@/lib/format';
import ImageDisplay from './ImageDisplay';

interface Item {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  states?: any[];
}

interface OperatorItemsTableProps {
  items: Item[];
  onItemSelect: (item: Item) => void;
  className?: string;
}

export const OperatorItemsTable: React.FC<OperatorItemsTableProps> = ({ 
  items, 
  onItemSelect, 
  className = '' 
}) => {
  const t = useTranslations('common');
  const handleRowClick = (item: Item) => {
    onItemSelect(item);
  };

  return (
    <div className={`operator-items-table ${className}`}>
      <Table hover responsive className="mb-0">
        <thead>
          <tr>
            <th>Imagen</th>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Estados</th>
            <th>Fecha Creación</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const statesCount = item.states?.length || 0;
            const truncatedDescription = item.description 
              ? (item.description.length > 100 
                  ? `${item.description.substring(0, 100)}...` 
                  : item.description)
              : t('noDescription');

            return (
              <tr 
                key={item.id}
                onClick={() => handleRowClick(item)}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                aria-label={`Ver detalles de ${item.name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(item);
                  }
                }}
              >
                <td>
                  <ImageDisplay
                    imageUrl={item.imageUrl}
                    alt={`Imagen de ${item.name}`}
                    clickable={false}
                    style={{ width: '50px', height: '50px' }}
                  />
                </td>
                <td>
                  <div className="fw-medium">{item.name}</div>
                </td>
                <td>
                  <div className="text-muted small">
                    {truncatedDescription}
                  </div>
                </td>
                <td>
                  {statesCount > 0 ? (
                    <span className="badge bg-primary">
                      {statesCount} estado{statesCount !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-muted small">Sin estados</span>
                  )}
                </td>
                <td>
                  <small className="text-muted">
                    {formatValueWithSmartDateDetection(item.createdAt, 'createdAt')}
                  </small>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};
