import React from 'react';
import { Button, Spinner } from 'react-bootstrap';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  hasMore: boolean;
  isMobile: boolean;
  isLoadingMore: boolean;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
  loadMoreRef?: React.RefObject<HTMLDivElement | null>;
}

export const PaginationControls: React.FC<PaginationControlsProps> = React.memo(({
  page,
  totalPages,
  hasMore,
  isMobile,
  isLoadingMore,
  onPageChange,
  onLoadMore: _onLoadMore,
  loadMoreRef,
}) => {
  const handlePrevious = () => onPageChange(Math.max(1, page - 1));
  const handleNext = () => onPageChange(Math.min(totalPages, page + 1));

  if (isMobile && hasMore) {
    return (
      <div ref={loadMoreRef} className="text-center py-3">
        {isLoadingMore ? (
          <Spinner animation="border" size="sm" variant="primary" />
        ) : (
          <div className="text-muted">Desliza para cargar más...</div>
        )}
      </div>
    );
  }

  if (!isMobile && totalPages > 1) {
    return (
      <div className="d-flex justify-content-end align-items-center mt-3 gap-2 pagination-controls" role="navigation" aria-label={`Paginación. Página ${page} de ${totalPages}`}>
        <Button 
          variant="outline-secondary" 
          disabled={page === 1} 
          onClick={handlePrevious}
          aria-label="Página anterior"
        >
          Anterior
        </Button>
        <span className="text-muted">
          Página {page} de {totalPages}
        </span>
        <Button 
          variant="outline-secondary" 
          disabled={page >= totalPages} 
          onClick={handleNext}
          aria-label="Página siguiente"
        >
          Siguiente
        </Button>
      </div>
    );
  }

  return null;
});

PaginationControls.displayName = 'PaginationControls';
