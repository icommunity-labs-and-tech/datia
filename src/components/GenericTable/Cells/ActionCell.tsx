import React from 'react';
import Button from 'react-bootstrap/Button';

export interface Action {
  label: string;
  icon: string;
  variant?: string;
  onClick: (row: any) => void;
  title?: string;
}

interface ActionCellProps {
  actions: Action[];
  row: any;
  size?: 'sm' | 'lg';
  className?: string;
}

export default function ActionCell({ actions, row, size = 'sm', className = '' }: ActionCellProps) {
  if (!actions || actions.length === 0) return null;
  
  return (
    <div className={`btn-group btn-group-${size} ${className}`}>
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant || 'outline-primary'}
          size={size}
          onClick={() => action.onClick(row)}
          title={action.title || action.label}
        >
          <i className={`bi ${action.icon}`}></i>
        </Button>
      ))}
    </div>
  );
}
