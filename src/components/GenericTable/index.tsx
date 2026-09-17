// src/components/GenericTable/index.tsx
'use client';

import { useReactTable, getCoreRowModel, getSortedRowModel, type SortingState } from '@tanstack/react-table';
import { useState, useEffect } from 'react';

import '@/components/GenericTable/GenericTable.css';
import AddItemModal from '../AddItemModal';
import { Divider } from '../Divider';
import EmptyState from '../EmptyTable';
import TablePagination from '@/components/GenericTable/TablePagination';
import { Toolbar } from './Toolbar';
import DataTable from '@/components/GenericTable/DataTable';
import type { GenericTableProps, FormTemplate, TableAction } from './types';
import { useTableFilter } from './useTableFilter';
import { useTableColumns } from './useTableColumns';

export default function GenericTable<TFormData = Record<string, unknown>>({
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
  modalTitle,
  onRowDoubleClick,
  rowActions,
}: GenericTableProps<TFormData>) {
  const [data, setData] = useState(initialData);
  // Mantener sincronizado el estado interno cuando cambie initialData (por ejemplo, tras borrar)
  useEffect(() => {
    setData(initialData);
  }, [initialData]);
  const { 
    filter, 
    handleFilterChange, 
    pageIndex, 
    setPageIndex, 
    pageSize,
    setPageSize,
    filteredData, 
    pageCount,
    totalItems
  } = useTableFilter(data, 5);
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
    setFormState({ template: [] }); // Inicializar con template vacío para StatusTypes
    setShowModal(true);
  };
  const handleCloseModal = () => setShowModal(false);

  const handleSubmit = async (formData: any, templateFields?: FormTemplate) => {
    if (onAddSubmit) {
      try {
        const result = await onAddSubmit(formData, templateFields);

        if (result) {
          const { publishSuccessNotification } = await import('@/lib/notificationEvents');
          publishSuccessNotification('Elemento Creado', 'Se ha creado el elemento correctamente');
          if (onItemCreated) onItemCreated(result, formData);

          const updatedData = [result, ...data];
          setData(updatedData);

          const indexInFiltered = updatedData.findIndex((row) => row.id === result.id);
          const targetPage = Math.floor(indexInFiltered / pageSize);

          setPageIndex(targetPage);
          setLastAddedId(result.id);
        }
      } catch (error) {
        const { publishErrorNotification } = await import('@/lib/notificationEvents');
        publishErrorNotification('Error', error instanceof Error ? error.message : String(error));
      }
    }
    setShowModal(false);
  };

  // Usar solo las columnas personalizadas si se proporcionan, evitando duplicación
  const customColumnsData = customColumns && customColumns.length > 0
    ? customColumns.map(col => ({
        accessorKey: col.key,
        header: col.label,
        cell: ({ row }: any) => col.render(row.original),
        sortDescFirst: false,
        enableSorting: col.enableSorting !== false, // Respetar la configuración de enableSorting
        ...(typeof col.sortingFn === 'function' ? { sortingFn: col.sortingFn } : {}),
      }))
    : null;

  const autoColumns = useTableColumns(filteredData, []);
  const columns = customColumnsData || autoColumns;

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
      <Toolbar
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
      />

      <Divider />

      <div className="w-100">
        {sortedRows.length === 0 ? (
          <EmptyState message="No hay elementos para mostrar en esta tabla." />
        ) : (
          <DataTable
            table={{
              getHeaderGroups: table.getHeaderGroups,
              getRowModel: () => ({ rows: paginatedRows }),
            }}
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
        setPageIndex={setPageIndex}
        pageSize={pageSize}
        totalItems={totalItems}
        showPageSizeSelector={true}
        onPageSizeChange={setPageSize}
      />

      {showModal && (
        <AddItemModal
          show={showModal}
          onHide={handleCloseModal}
          formTemplate={formTemplate || []}
          formState={formState}
          setFormState={setFormState}
          onSubmit={handleSubmit}
          allowTemplateEditing={allowTemplateEditing}
          attachmentId={attachmentId}
          customFormContent={
            typeof customFormContent === 'function'
              ? customFormContent({ formState, setFormState })
              : customFormContent
          }
          isIssueTemplate={isIssueTemplate}
          uploadType={uploadType}
          modalTitle={modalTitle}
        />
      )}
    </>
  );
}

export type { FormTemplate, GenericTableProps, TableAction } from './types';


