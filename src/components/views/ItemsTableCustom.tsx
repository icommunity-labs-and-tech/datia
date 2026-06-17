'use client';

import { useReactTable, getCoreRowModel, getSortedRowModel, type SortingState } from '@tanstack/react-table';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTableFilter } from '@/components/GenericTable/useTableFilter';
import { useTableColumns } from '@/components/GenericTable/useTableColumns';
import AddItemModal from '@/components/AddItemModal';
import { Divider } from '@/components/Divider';
import EmptyState from '@/components/EmptyTable';
import TablePagination from '@/components/GenericTable/TablePagination';
import DataTable from '@/components/GenericTable/DataTable';
import ItemsTableToolbar from './ItemsTableToolbar';
import type { GenericTableProps, FormTemplate, TableAction } from '@/components/GenericTable/types';

interface ItemsTableCustomProps<TFormData = Record<string, unknown>> extends GenericTableProps<TFormData> {
  filterType: 'name' | 'id' | 'category';
  onFilterTypeChange: (type: 'name' | 'id' | 'category') => void;
  categories?: Array<{ id: string; name: string }>;
  onCategoryChange?: (categoryId: string | null) => void;
  onExportCsvClick?: () => void;
  exportCsvLabel?: string;
}

export default function ItemsTableCustom<TFormData = Record<string, unknown>>({
  initialData,
  title,
  icon,
  formTemplate,
  onAddSubmit,
  onItemCreated,
  allowTemplateEditing = true,
  attachmentId,
  actions,
  customColumns = [],
  uploadType = 'product',
  customFormContent,
  isIssueTemplate = false,
  filterPlaceholder,
  addButtonLabel,
  filterType,
  onFilterTypeChange,
  categories = [],
  onCategoryChange,
  onExportCsvClick,
  exportCsvLabel,
  onRowDoubleClick,
  rowActions,
}: ItemsTableCustomProps<TFormData>) {
  const [data, setData] = useState(initialData);
  
  // Mantener sincronizado el estado interno cuando cambie initialData
  useEffect(() => {
    setData(initialData);
  }, [initialData]);
  
  const [filter, setFilter] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  // Filtrado según el tipo seleccionado
  // Nota: El filtrado por categoría ahora requiere cargar las categorías de cada item
  // Por ahora, simplificamos el filtrado
  const filteredData = useMemo(() => {
    if (!filter) return data;
    
    const lowerFilter = filter.toLowerCase();
    
    return data.filter((item: any) => {
      switch (filterType) {
        case 'name':
          return item.name?.toLowerCase().includes(lowerFilter);
        case 'id':
          return item.id?.toLowerCase().includes(lowerFilter);
        case 'category':
          // Filtrar por nombre de categoría (case-insensitive)
          if (!item.categories || item.categories.length === 0) {
            return false;
          }
          return item.categories.some((cat: any) =>
            cat.name?.toLowerCase().includes(lowerFilter)
          );
        default:
          return false;
      }
    });
  }, [data, filter, filterType]);

  const pageCount = Math.ceil(filteredData.length / pageSize);

  const handleFilterChange = useCallback((value: string) => {
    setFilter(value);
    setPageIndex(0);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPageIndex(0);
  }, []);

  const setPageIndexSafe = useCallback((index: number) => {
    const maxIndex = Math.max(0, pageCount - 1);
    setPageIndex(Math.max(0, Math.min(index, maxIndex)));
  }, [pageCount]);

  // Manejar cambio de categoría
  const handleCategoryChange = useCallback((categoryId: string | null) => {
    // Llamar a la función externa si existe
    if (onCategoryChange) {
      onCategoryChange(categoryId);
    }
    
    // Limpiar el formulario pero mantener las categorías seleccionadas
    setFormState(prevState => ({
      ...prevState,
      categoryIds: categoryId ? [categoryId] : []
    }));
  }, [onCategoryChange]);

  const totalItems = data.length;
  
  const [showModal, setShowModal] = useState(false);
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [selectedRow, setSelectedRow] = useState<Record<string, any> | null>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    if (lastAddedId) {
      const timeout = setTimeout(() => setLastAddedId(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [lastAddedId]);

  const handleAddClick = () => {
    // Inicializar con categorías vacías
    setFormState({ categoryIds: [] });
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setFormState({});
  };

  const handleSubmit = async (combinedData: Record<string, any>, templateFields?: FormTemplate) => {
    try {
      const result = await onAddSubmit?.(combinedData as TFormData, templateFields);
      
      if (result) {
        // Actualizar la lista de datos con el nuevo item
        const updatedData = [result, ...data];
        setData(updatedData);
        
        // Calcular la página donde debería aparecer el nuevo item
        const indexInFiltered = updatedData.findIndex((row) => row.id === result.id);
        const targetPage = Math.floor(indexInFiltered / pageSize);
        setPageIndex(targetPage);
        
        // Marcar el item como recién añadido para resaltarlo
        setLastAddedId(result.id);
        
        // Llamar al callback si existe
        if (onItemCreated) {
          onItemCreated(result, combinedData);
        }
      }
      
      setShowModal(false);
      setFormState({});
      return result;
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    }
  };

  // Usar las columnas personalizadas del ItemsTable
  const columns = useTableColumns(filteredData, customColumns);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const sortedRows = table.getRowModel().rows;
  const paginatedRows = sortedRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  return (
    <>
      <ItemsTableToolbar
        icon={icon}
        title={title}
        filter={filter}
        onFilterChange={handleFilterChange}
        selectedRow={selectedRow}
        actions={actions}
        onActionClick={(action: TableAction) => selectedRow && action.onClick(selectedRow)}
        showAddButton={!!formTemplate}
        onAddClick={handleAddClick}
        filterPlaceholder={filterPlaceholder}
        addButtonLabel={addButtonLabel}
        filterType={filterType}
        onFilterTypeChange={onFilterTypeChange}
        onExportCsvClick={onExportCsvClick}
        exportCsvLabel={exportCsvLabel}
      />

      <Divider />

      <div className="w-100">
        {sortedRows.length === 0 ? (
          <EmptyState message="No hay elementos para mostrar en esta tabla." />
        ) : (
          <DataTable
            table={{
              ...table,
              getRowModel: () => ({ rows: paginatedRows }),
            } as any}
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            lastAddedId={lastAddedId}
            onRowDoubleClick={onRowDoubleClick}
            rowActions={rowActions}
          />
        )}
      </div>

      <Divider />

      <TablePagination 
        pageCount={pageCount} 
        pageIndex={pageIndex} 
        setPageIndex={setPageIndexSafe}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        showPageSizeSelector={true}
        totalItems={totalItems}
      />

      {showModal && formTemplate && (
        <AddItemModal
          show={showModal}
          onHide={handleModalClose}
          onSubmit={handleSubmit}
          formTemplate={formTemplate}
          formState={formState}
          setFormState={setFormState}
          allowTemplateEditing={allowTemplateEditing}
          attachmentId={attachmentId}
          uploadType={uploadType}
          customFormContent={typeof customFormContent === 'function' 
            ? customFormContent({ formState, setFormState }) 
            : customFormContent}
          isIssueTemplate={isIssueTemplate}
          onCategoryChange={handleCategoryChange}
          useWizard={false}
        />
      )}
    </>
  );
}
