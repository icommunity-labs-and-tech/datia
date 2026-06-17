import Pagination from 'react-bootstrap/Pagination';
import { Form, InputGroup } from 'react-bootstrap';
import { useTranslations } from 'next-intl';

type Props = {
  pageCount: number;
  pageIndex: number;
  setPageIndex: (index: number) => void;
  pageSize?: number;
  totalItems?: number;
  showPageSizeSelector?: boolean;
  onPageSizeChange?: (newPageSize: number) => void;
};

export default function TablePagination({ 
  pageCount, 
  pageIndex, 
  setPageIndex, 
  pageSize = 5,
  totalItems = 0,
  showPageSizeSelector = false,
  onPageSizeChange
}: Props) {
  const t = useTranslations('tables.pagination');

  if (pageCount <= 1) return null;

  const startItem = pageIndex * pageSize + 1;
  const endItem = Math.min((pageIndex + 1) * pageSize, totalItems);
  const currentPage = pageIndex + 1;

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(event.target.value);
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7; // Máximo de páginas visibles
    
    if (pageCount <= maxVisiblePages) {
      // Si hay pocas páginas, mostrar todas
      for (let i = 0; i < pageCount; i++) {
        pages.push(
          <Pagination.Item 
            key={i} 
            active={i === pageIndex} 
            onClick={() => setPageIndex(i)}
          >
            {i + 1}
          </Pagination.Item>
        );
      }
    } else {
      // Lógica para mostrar páginas con elipsis
      const leftBound = Math.max(0, pageIndex - 2);
      const rightBound = Math.min(pageCount - 1, pageIndex + 2);
      
      // Primera página
      if (leftBound > 0) {
        pages.push(
          <Pagination.Item key={0} onClick={() => setPageIndex(0)}>
            1
          </Pagination.Item>
        );
        
        if (leftBound > 1) {
          pages.push(<Pagination.Ellipsis key="left-ellipsis" />);
        }
      }
      
      // Páginas centrales
      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(
          <Pagination.Item 
            key={i} 
            active={i === pageIndex} 
            onClick={() => setPageIndex(i)}
          >
            {i + 1}
          </Pagination.Item>
        );
      }
      
      // Última página
      if (rightBound < pageCount - 1) {
        if (rightBound < pageCount - 2) {
          pages.push(<Pagination.Ellipsis key="right-ellipsis" />);
        }
        
        pages.push(
          <Pagination.Item 
            key={pageCount - 1} 
            onClick={() => setPageIndex(pageCount - 1)}
          >
            {pageCount}
          </Pagination.Item>
        );
      }
    }
    
    return pages;
  };

  return (
    <div className="pagination-container d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mt-3">
      {/* Información de páginas */}
      <div className="pagination-info text-muted small">
        {totalItems > 0 ? (
          <>{t('showing', { start: startItem, end: endItem, total: totalItems })}</>
        ) : (
          <>{t('page', { currentPage, pageCount })}</>
        )}
      </div>

      {/* Controles de paginación */}
      <div className="pagination-controls d-flex align-items-center gap-2">
        {/* Selector de tamaño de página */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="page-size-selector">
            <span className="text-muted small">{t('show')}</span>
            <Form.Select 
              size="sm" 
              style={{ width: 'auto' }}
              value={pageSize}
              onChange={handlePageSizeChange}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </Form.Select>
          </div>
        )}

        {/* Navegación de páginas */}
        <Pagination className="mb-0">
          {/* Botón Primera página */}
          <Pagination.First 
            onClick={() => setPageIndex(0)}
            disabled={pageIndex === 0}
            title={t('firstPage')}
          />
          
          {/* Botón Anterior */}
          <Pagination.Prev 
            onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
            disabled={pageIndex === 0}
            title={t('previousPage')}
          />
          
          {/* Números de página */}
          {renderPageNumbers()}
          
          {/* Botón Siguiente */}
          <Pagination.Next 
            onClick={() => setPageIndex(Math.min(pageCount - 1, pageIndex + 1))}
            disabled={pageIndex === pageCount - 1}
            title={t('nextPage')}
          />
          
          {/* Botón Última página */}
          <Pagination.Last 
            onClick={() => setPageIndex(pageCount - 1)}
            disabled={pageIndex === pageCount - 1}
            title={t('lastPage')}
          />
        </Pagination>
      </div>
    </div>
  );
}


