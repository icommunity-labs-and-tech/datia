import React from 'react';
import { ActionIcon, Group } from '@mantine/core';

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

// Legacy bootstrap variants ('outline-danger', 'primary'…) map onto Mantine colors
function variantColor(variant?: string): string {
  const v = (variant ?? '').replace('outline-', '');
  switch (v) {
    case 'danger': return 'red';
    case 'success': return 'green';
    case 'warning': return 'yellow';
    case 'secondary': return 'gray';
    case 'info': return 'cyan';
    default: return 'datiaBlue';
  }
}

export default function ActionCell({ actions, row, size = 'sm', className = '' }: ActionCellProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <Group gap={4} wrap="nowrap" className={className}>
      {actions.map((action, index) => (
        <ActionIcon
          key={index}
          variant="light"
          color={variantColor(action.variant)}
          size={size === 'lg' ? 'lg' : 'md'}
          onClick={() => action.onClick(row)}
          title={action.title || action.label}
          aria-label={action.title || action.label}
        >
          <i className={`bi ${action.icon}`}></i>
        </ActionIcon>
      ))}
    </Group>
  );
}
