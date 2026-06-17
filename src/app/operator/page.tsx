'use client';

import { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Button, Spinner, Form } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { useAuthSeparated } from '@/hooks/useAuthSeparated';
import { Box, BoxHeader } from '@/components';
import { ItemCard } from '@/components/ItemCard';
import { OperatorItemsTable } from '@/components/OperatorItemsTable';
import { ViewToggle } from '@/components/ViewToggle';
import { PaginationControls } from '@/components/PaginationControls';
import { Toolbar } from '@/components/GenericTable/Toolbar';
import { getItems } from '@/actions/items';
import { UnifiedScannerButton } from '@/components';
import { useTranslations } from 'next-intl';
import { usePagination } from '@/hooks/usePagination';
import { useItemFilter } from '@/hooks/useItemFilter';
import { OPERATOR_CONSTANTS } from '@/constants/operator';
import { useAdminOperatorAccess } from '@/hooks/useAdminOperatorAccess';
import './operator.css';

type Item = any;

export default function OperatorPage() {
  const t = useTranslations('operator');
  const { user, logout } = useAuthSeparated();
  const router = useRouter();
  const { clearAdminOperatorAccess } = useAdminOperatorAccess();

  // State
  const [itemsList, setItemsList] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');

  // Custom hooks
  const {
    searchQuery,
    filteredItems,
    handleSearchChange: filterSearchChange,
    categoryFilter,
    setCategoryFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    availableCategories,
    clearFilters,
    hasActiveFilters,
  } = useItemFilter(itemsList, {
    searchFields: OPERATOR_CONSTANTS.SEARCH_FIELDS as any,
  });

  const {
    page,
    hasMore,
    isMobile,
    isLoadingMore,
    paginatedItems,
    totalPages,
    setPage,
    loadMore,
    resetPagination,
    loadMoreRef,
  } = usePagination(filteredItems, {
    pageSize: OPERATOR_CONSTANTS.PAGE_SIZE,
    mobileBreakpoint: OPERATOR_CONSTANTS.MOBILE_BREAKPOINT,
  });

  // Effects
  useEffect(() => {
    const loadItems = async () => {
      try {
        const data = await getItems();
        setItemsList(data);
      } catch (err) {
        console.error('Error cargando items:', err);
      } finally {
        setIsLoadingItems(false);
      }
    };
    loadItems();
  }, []);

  // Handlers
  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/auth/operator/login');
  }, [logout, router]);

  const handleItemSelect = useCallback((item: Item) => {
    router.push(`/operator/items/${item.id}`);
  }, [router]);

  const handleSearchChange = useCallback((query: string) => {
    filterSearchChange(query);
    resetPagination();
  }, [filterSearchChange, resetPagination]);

  const handleFilterChange = useCallback(() => {
    resetPagination();
  }, [resetPagination]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, [setPage]);

  const handleViewChange = useCallback((view: 'grid' | 'table') => {
    if (isMobile) {
      setViewType('grid');
    } else {
      setViewType(view);
    }
  }, [isMobile]);

  const displayItems = isMobile ? filteredItems.slice(0, page * OPERATOR_CONSTANTS.PAGE_SIZE) : paginatedItems;

  // Forzar vista grid en móvil
  useEffect(() => {
    if (isMobile && viewType !== 'grid') {
      setViewType('grid');
    }
  }, [isMobile, viewType]);

  return (
    <Container id="main" fluid className="operator-page" role="main" aria-label={t('title')}>
      <Row className="mb-4 operator-header" role="region">
        <Col>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="me-2">
              <h1 className="h3 mb-0">{t('title')}</h1>
              <p className="text-muted mb-0">{t('welcome', { name: user?.name || '' })}</p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <UnifiedScannerButton
                appContext="operator"
                returnUrl="/operator"
                variant="primary"
                aria-label={t('openScanner')}
              >
                {t('startScan')}
              </UnifiedScannerButton>
              {user?.role === 'ADMIN' && (
                <Button variant="outline-primary" onClick={clearAdminOperatorAccess} aria-label={t('backToDashboard')} className="icon-button-mobile">
                  <i className="bi bi-speedometer2 me-md-2"></i>
                  <span className="d-none d-md-inline">{t('backToDashboard')}</span>
                </Button>
              )}
              <Button variant="outline-secondary" onClick={handleLogout} aria-label={t('logout')} className="icon-button-mobile">
                <i className="bi bi-box-arrow-right me-md-2"></i>
                <span className="d-none d-md-inline">{t('logout')}</span>
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Box>
            <div className="items-list-container">
              <BoxHeader title="">
                <div className="d-flex align-items-center gap-2 w-100 flex-wrap" aria-label="Barra de búsqueda y filtros">
                  <ViewToggle
                    currentView={viewType}
                    onViewChange={handleViewChange}
                    className="d-none d-md-flex"
                  />
                  <h5 className="mb-0 me-2">{t('inventory')}</h5>

                  <div className="ms-auto d-flex align-items-center gap-2">
                    <Form.Select
                      value={categoryFilter}
                      onChange={(e) => { setCategoryFilter(e.target.value); handleFilterChange(); }}
                      disabled={availableCategories.length === 0}
                      style={{ maxWidth: 200 }}
                    >
                      <option value="">{t('filterByCategory')}</option>
                      {availableCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </Form.Select>

                    <Form.Control
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); handleFilterChange(); }}
                      style={{ maxWidth: 160 }}
                      title={t('dateFrom')}
                    />

                    <Form.Control
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); handleFilterChange(); }}
                      style={{ maxWidth: 160 }}
                      title={t('dateTo')}
                    />

                    {hasActiveFilters && (
                      <Button
                        variant="link"
                        size="sm"
                        className="text-muted p-0"
                        onClick={() => { clearFilters(); handleFilterChange(); }}
                        title={t('clearFilters')}
                      >
                        <i className="bi bi-x-circle" />
                      </Button>
                    )}

                    <div style={{ marginBottom: '-0.5rem' }}>
                      <Toolbar
                        filter={searchQuery}
                        onFilterChange={handleSearchChange}
                        selectedRow={null}
                        onActionClick={() => {}}
                        showAddButton={false}
                        onAddClick={() => {}}
                        filterPlaceholder={t('search')}
                        className="mb-0"
                      />
                    </div>
                  </div>
                </div>
              </BoxHeader>

              {isLoadingItems ? (
                <div className="text-center py-4" role="status" aria-live="polite">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2 text-muted">{t('loadingProducts')}</p>
                </div>
              ) : filteredItems.length > 0 ? (
                viewType === 'grid' ? (
                  <div className="items-grid">
                    {displayItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onClick={handleItemSelect}
                      />
                    ))}
                  </div>
                ) : (
                  <OperatorItemsTable
                    items={displayItems}
                    onItemSelect={handleItemSelect}
                  />
                )
              ) : (
                <div className="text-center py-4" role="region" aria-label={t('noProducts')}>
                  <div className="empty-state">
                    <span className="empty-icon">📦</span>
                    <h6 className="empty-title">{t('noProducts')}</h6>
                    <p className="empty-message">{t('noProductsDescription')}</p>
                  </div>
                </div>
              )}

              <PaginationControls
                page={page}
                totalPages={totalPages}
                hasMore={hasMore}
                isMobile={isMobile}
                isLoadingMore={isLoadingMore}
                onPageChange={handlePageChange}
                onLoadMore={loadMore}
                loadMoreRef={loadMoreRef}
              />
            </div>
          </Box>
        </Col>
      </Row>
    </Container>
  );
}
