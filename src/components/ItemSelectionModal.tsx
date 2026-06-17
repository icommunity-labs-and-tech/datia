'use client';

import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import ItemSelectionTable from './ItemSelectionTable';
import { useItemSelection } from '@/hooks/useItemSelection';
import { useEffect, useState } from 'react';

interface PreviewField {
  key: string;
  label: string;
}

interface ItemSelectionModalProps {
  show: boolean;
  onHide: () => void;
  title: string;
  footer?: (selectedItemIds: string[], items: any[]) => React.ReactNode;
  children?: React.ReactNode;
  previewFields?: PreviewField[];
  autoLoad?: boolean;
  onItemsLoaded?: (items: any[]) => void;
}

function getPreviewValue(key: string, item: any): string {
  switch (key) {
    case 'id': return item.id ?? '—';
    case 'name': return item.name ?? '—';
    case 'description': return item.description || '—';
    case 'allCategories': return (item.categories ?? []).map((c: any) => c.name).join('; ') || '—';
    case 'createdAt': return item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—';
    case 'lastStateTitle': return '—';
    case 'lastStateDate': return '—';
    case 'customerUrl': return `/customer/item/${item.id}`;
    default: return '—';
  }
}

const STEP_LABELS = ['Campos', 'Productos', 'Previsualización'];

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="d-flex align-items-center justify-content-center mb-4">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const isActive = n === step;
        const isDone = n < step;
        return (
          <div key={n} className="d-flex align-items-center">
            <div className="d-flex flex-column align-items-center">
              <div
                className={`d-flex align-items-center justify-content-center rounded-circle mb-1 ${
                  isDone ? 'bg-success text-white' :
                  isActive ? 'bg-primary text-white' :
                  'bg-light text-muted border'
                }`}
                style={{ width: 32, height: 32, fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
              >
                {isDone ? <i className="bi bi-check" /> : n}
              </div>
              <small
                className={`text-nowrap ${isActive ? 'text-primary fw-semibold' : isDone ? 'text-success' : 'text-muted'}`}
                style={{ fontSize: '0.72rem' }}
              >
                {label}
              </small>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                style={{
                  height: 2,
                  width: 60,
                  marginBottom: 20,
                  marginLeft: 8,
                  marginRight: 8,
                  background: isDone ? '#198754' : '#dee2e6',
                  transition: 'background 0.3s',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center text-muted rounded"
      style={{ minHeight: 220, border: '1px dashed #dee2e6', background: '#fafafa' }}
    >
      <i className={`bi ${icon} fs-2 mb-2 opacity-25`} />
      <span className="small text-center px-4">{text}</span>
    </div>
  );
}

export default function ItemSelectionModal({
  show,
  onHide,
  title,
  footer,
  children,
  previewFields,
  autoLoad = true,
  onItemsLoaded,
}: ItemSelectionModalProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const isWizard = !!(children && previewFields);

  const {
    items,
    filteredItems,
    selectedItemIds,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    availableCategories,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    isLoadingItems,
    selectedCount,
    toggleItem,
    selectAllFiltered,
    clearSelection,
    loadItems,
    reset,
  } = useItemSelection();

  useEffect(() => {
    if (show && autoLoad) {
      loadItems().then((loadedItems) => {
        if (onItemsLoaded) onItemsLoaded(loadedItems);
      });
    } else if (!show) {
      reset();
      setStep(1);
    }
  }, [show, autoLoad, loadItems, reset, onItemsLoaded]);

  const previewItems = previewFields
    ? items.filter(it => selectedItemIds.includes(it.id)).slice(0, 10)
    : [];
  const remaining = selectedItemIds.length - previewItems.length;

  const table = (
    <ItemSelectionTable
      items={filteredItems}
      selectedItemIds={selectedItemIds}
      onToggleItem={toggleItem}
      search={search}
      onSearchChange={setSearch}
      categoryFilter={categoryFilter}
      onCategoryFilterChange={setCategoryFilter}
      availableCategories={availableCategories}
      dateFrom={dateFrom}
      onDateFromChange={setDateFrom}
      dateTo={dateTo}
      onDateToChange={setDateTo}
      selectedCount={selectedCount}
      onSelectAll={selectAllFiltered}
      onClearSelection={clearSelection}
      tableHeight={420}
    />
  );

  const renderStep = () => {
    if (!isWizard) return table;

    switch (step) {
      case 1:
        return (
          <div>
            <p className="text-muted small mb-3">
              Selecciona los campos que quieres incluir en el CSV.
            </p>
            {children}
          </div>
        );

      case 2:
        return table;

      case 3:
        return (
          <>
            <p className="text-muted small mb-3">
              {selectedItemIds.length === 0
                ? 'No hay productos seleccionados.'
                : `${selectedItemIds.length} producto${selectedItemIds.length !== 1 ? 's' : ''} seleccionado${selectedItemIds.length !== 1 ? 's' : ''} · ${previewFields!.length} campo${previewFields!.length !== 1 ? 's' : ''}`}
            </p>
            {previewFields!.length === 0 ? (
              <EmptyState icon="bi-layout-three-columns" text="No hay campos seleccionados. Vuelve al paso 1 para elegir qué columnas incluir." />
            ) : previewItems.length === 0 ? (
              <EmptyState icon="bi-table" text="No hay productos seleccionados. Vuelve al paso 2 para elegir qué productos exportar." />
            ) : (
              <>
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 400, border: '1px solid #dee2e6', borderRadius: 6 }}>
                  <table className="table table-sm table-bordered table-hover mb-0" style={{ fontSize: '0.8rem', minWidth: 'max-content' }}>
                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr>
                        {previewFields!.map(f => (
                          <th key={f.key} className="text-nowrap px-3 py-2">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.map(item => (
                        <tr key={item.id}>
                          {previewFields!.map(f => (
                            <td key={f.key} className="px-3 py-1">
                              <span
                                className="d-block text-truncate"
                                title={getPreviewValue(f.key, item)}
                                style={{ maxWidth: 200 }}
                              >
                                {getPreviewValue(f.key, item)}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {remaining > 0 && (
                  <p className="text-muted small mt-2 mb-0">
                    <i className="bi bi-three-dots me-1" />
                    y {remaining} producto{remaining !== 1 ? 's' : ''} más
                  </p>
                )}
              </>
            )}
          </>
        );
    }
  };

  return (
    <Modal show={show} onHide={onHide} size={isWizard ? 'xl' : 'lg'} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-filetype-csv me-2" />{title}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {isLoadingItems ? (
          <div className="text-center py-5 text-muted">
            <div className="spinner-border spinner-border-sm me-2" role="status" />
            Cargando productos...
          </div>
        ) : (
          <>
            {isWizard && <StepIndicator step={step} />}
            {renderStep()}
          </>
        )}
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        {/* Left: back */}
        <div>
          {isWizard && step > 1 && (
            <Button variant="outline-secondary" onClick={() => setStep(s => s - 1)}>
              <i className="bi bi-arrow-left me-1" /> Anterior
            </Button>
          )}
        </div>

        {/* Right: next / action */}
        <div className="d-flex gap-2">
          {isWizard && step < totalSteps && (
            <Button variant="primary" onClick={() => setStep(s => s + 1)}>
              Siguiente <i className="bi bi-arrow-right ms-1" />
            </Button>
          )}
          {(!isWizard || step === totalSteps) && footer && footer(selectedItemIds, items)}
          {!footer && (
            <Button variant="secondary" onClick={onHide}>Cancelar</Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
}

export { useItemSelection };
