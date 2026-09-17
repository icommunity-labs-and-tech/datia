import type { ReactNode } from 'react';

export type FormField = {
  label: string;
  name: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'image' | 'select';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>; // para selects
  required?: boolean;
};

export type FormTemplate = FormField[];

export type TableAction = {
  label: string;
  onClick: (row: Record<string, any>) => void;
  icon?: string;
  variant?: string;
  title?: string;
};

export type RowAction = {
  label: string;
  icon?: string;
  onClick: (row: Record<string, any>) => void;
  variant?: string;
};

export type CustomColumn = {
  key: string;
  label: string;
  render: (row: Record<string, any>) => ReactNode;
  enableSorting?: boolean;
  sortingFn?: (a: any, b: any) => number;
};

// Nuevo tipo para configuración de columnas
export type ColumnConfig = {
  key: string;
  label: string;
  format?: 'text' | 'date' | 'datetime' | 'badge' | 'status' | 'number' | 'currency' | 'image' | 'custom';
  render?: (value: any, row: Record<string, any>) => ReactNode;
  width?: string;
  sortable?: boolean;
  hidden?: boolean;
  align?: 'left' | 'center' | 'right';
};

export type ColumnConfigOptions = {
  showIds?: boolean;
  showTimestamps?: boolean;
  showTechnicalFields?: boolean;
  customFormatters?: Record<string, (value: any, row: Record<string, any>) => ReactNode>;
};

export type GenericTableProps<TFormData = Record<string, unknown>> = {
  initialData: Record<string, any>[];
  title?: string;
  icon?: string;
  formTemplate?: FormTemplate;
  onAddSubmit?: (formData: TFormData, templateFields?: FormTemplate) => any | Promise<any>;
  onItemCreated?: (result: any, formData: Record<string, any>) => void;
  allowTemplateEditing?: boolean;
  attachmentId?: string;
  actions?: TableAction[];
  customColumns?: CustomColumn[];
  uploadType?: 'product' | 'item';
  customFormContent?: ReactNode | ((ctx: { formState: Record<string, any>; setFormState: (s: Record<string, any>) => void }) => ReactNode);
  // Nuevas props para configuración de columnas
  columnConfig?: ColumnConfig[];
  columnConfigOptions?: ColumnConfigOptions;
  // Props para personalizar textos del toolbar
  filterPlaceholder?: string;
  addButtonLabel?: string;
  modalTitle?: string;
  onRowDoubleClick?: (row: Record<string, any>) => void;
  rowActions?: RowAction[];
};


