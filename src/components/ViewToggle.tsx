'use client';

import React from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';

interface ViewToggleProps {
  currentView: 'grid' | 'table';
  onViewChange: (view: 'grid' | 'table') => void;
  className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ 
  currentView, 
  onViewChange, 
  className = '' 
}) => {
  return (
    <ButtonGroup size="sm" className={className}>
      <Button
        variant={currentView === 'grid' ? 'primary' : 'outline-secondary'}
        onClick={() => onViewChange('grid')}
        aria-label="Vista de cuadrícula"
        title="Vista de cuadrícula"
      >
        <i className="bi bi-grid-3x3-gap"></i>
      </Button>
      <Button
        variant={currentView === 'table' ? 'primary' : 'outline-secondary'}
        onClick={() => onViewChange('table')}
        aria-label="Vista de tabla"
        title="Vista de tabla"
      >
        <i className="bi bi-table"></i>
      </Button>
    </ButtonGroup>
  );
};
