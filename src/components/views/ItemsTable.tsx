'use client'

import Box from '@/components/Box';
import { FormTemplate } from '@/components/GenericTable';
import LoadingOverlay from '@/components/Loading';
import ItemImageColumn from '@/components/ItemImageColumn';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { getItems, addItem, deleteItem, getItemDetails } from '@/actions/items';
import { exportItemsCsvWithFields } from '@/actions/exports';
import ItemSelectionModal from '@/components/ItemSelectionModal';
import FieldSelector, { type FieldKey } from '@/components/FieldSelector';
import DownloadZipButton from '@/components/DownloadZipButton';
import { getCategories } from '@/actions/categories';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { useDeleteEntity } from '@/hooks/useDeleteEntity';
import { getCascadeInfo } from '@/config/entityConfig';
import ItemsTableCustom from './ItemsTableCustom';
import { Divider } from '@/components/Divider';
import CategoryEditor from '@/components/CategoryEditor';
import KycInfoBanner from '@/components/KycInfoBanner';
import { useTranslations, useLocale } from 'next-intl';
import { useTutorialContext } from '@/lib/tutorial/TutorialProvider';
import { getTutorialItems } from '@/lib/tutorial/tutorialExampleData';
 

// Función helper para crear el template base de items con traducciones
const createBaseItemFormTemplate = (tForms: (key: string) => string): FormTemplate => [
  { name: 'customId', label: tForms('labels.productId'), type: 'text', placeholder: tForms('labels.productId'), required: true },
  { name: 'name', label: tForms('labels.name'), type: 'text', placeholder: tForms('labels.productName'), required: true },
  { name: 'description', label: tForms('labels.description'), type: 'text', placeholder: tForms('labels.productDescription') },
  { name: 'imageUrl', label: tForms('labels.image'), type: 'image', placeholder: tForms('labels.imageUrl') },
];

interface ItemsTableProps {
  title?: string;
  showBox?: boolean;
  onItemSelect?: (item: any) => void;
  customActions?: Array<{ label: string; onClick: (row: any) => void }>;
  customColumns?: Array<{ key: string; label: string; render: (item: any) => React.ReactNode }>;
  allowTemplateEditing?: boolean;
  externalData?: any[];
  onDataChange?: () => void;
  showDescription?: boolean;
}

export default function ItemsTable({
  title,
  showBox = true,
  onItemSelect,
  customActions = [],
  customColumns = [],
  allowTemplateEditing = true,
  externalData,
  onDataChange,
  showDescription = true,
}: ItemsTableProps) {
  const t = useTranslations('tables');
  const tModals = useTranslations('modals');
  const tForms = useTranslations('forms');
  const tExports = useTranslations('exports');
  const locale = useLocale();
  const defaultTitle = title || t('items');
  const baseItemFormTemplate = useMemo(() => createBaseItemFormTemplate(tForms), [tForms]);
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string>('');
  const [filterType, setFilterType] = useState<'name' | 'id' | 'category'>('name');
  const [showCsvExportModal, setShowCsvExportModal] = useState(false);
  const availableFields = useMemo(() => [
    { key: 'id' as FieldKey, label: tExports('fieldLabels.id') },
    { key: 'name' as FieldKey, label: tExports('fieldLabels.name') },
    { key: 'description' as FieldKey, label: tExports('fieldLabels.description') },
    { key: 'allCategories' as FieldKey, label: tExports('fieldLabels.allCategories') },
    { key: 'createdAt' as FieldKey, label: tExports('fieldLabels.createdAt') },
    { key: 'lastStateTitle' as FieldKey, label: tExports('fieldLabels.lastStateTitle') },
    { key: 'lastStateDate' as FieldKey, label: tExports('fieldLabels.lastStateDate') },
    { key: 'customerUrl' as FieldKey, label: tExports('fieldLabels.customerUrl') },
  ], [tExports]);
  const [selectedFields, setSelectedFields] = useState<FieldKey[]>(['id', 'name', 'allCategories', 'createdAt', 'customerUrl']);
  const router = useRouter();
  const { isTourActive, organizationSector } = useTutorialContext();
  const showTutorialExamples = isTourActive;

  // Usar el hook refactorizado
  const {
    showDeleteModal,
    entityToDelete,
    isDeleting,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
  } = useDeleteEntity(deleteItem, {
    entityName: 'Producto',
    redirectPath: '/dashboard/items',
    onSuccess: (deleted) => {
      if (externalData !== undefined) {
        onDataChange?.();
      } else {
        const deletedId = (deleted?.id || entityToDelete?.id);
        if (deletedId) {
          setItems(prev => prev.filter(item => item.id !== deletedId));
        }
      }
    },
    onError: (error) => {
      alert(t('deleteProductError'));
    },
  });

  useEffect(() => {
    if (externalData !== undefined) {
      setIsLoading(false);
      return;
    }
    const loadData = async () => {
      try {
        if (showTutorialExamples) {
          setItems(getTutorialItems(organizationSector || 'fashion'));
          setProducts([]);
          setIsLoading(false);
          return;
        }
        const [itemsData, categoriesData] = await Promise.all([
          getItems(),
          getCategories()
        ]);
        setItems(itemsData);
        setProducts(categoriesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [externalData, showTutorialExamples, organizationSector]);

  // Los items se pasan sin filtrar, el filtrado se hace en ItemsTableCustom
  const filteredItems = externalData !== undefined ? externalData : items;

  // Función para generar etiqueta automáticamente del nombre
  const generateLabel = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Función para generar placeholder automáticamente
  const generatePlaceholder = (name: string, type: string): string => {
    const basePlaceholder = generateLabel(name);
    switch (type) {
      case 'number':
        return `Ej: 123`;
      case 'email':
        return `ejemplo@email.com`;
      case 'date':
        return `DD/MM/AAAA`;
      case 'select':
        return `Selecciona una opción`;
      case 'image':
        return `Selecciona una imagen`;
      default:
        return `Ingresa ${basePlaceholder.toLowerCase()}`;
    }
  };

  // Obtener el template de la categoría seleccionada
  // Nota: Las categorías ahora se gestionan como tags, pero aún podemos usar templates de categorías
  const getSelectedProductTemplate = (): FormTemplate => {
    // Si no hay categoría seleccionada, usar el template básico
    if (!selectedProductId) {
      return baseItemFormTemplate;
    }
    
    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct || !selectedProduct.itemTemplate) return baseItemFormTemplate;

    // Verificar que itemTemplate sea un array
    let productTemplate: FormTemplate = [];
    
    try {
      if (Array.isArray(selectedProduct.itemTemplate)) {
        // Generar etiquetas y placeholders automáticamente
        productTemplate = selectedProduct.itemTemplate.map((field: any) => ({
          name: field.name,
          label: generateLabel(field.name),
          type: field.type || 'text',
          placeholder: generatePlaceholder(field.name, field.type || 'text'),
          required: field.required || false,
          options: field.type === 'select' && field.options 
            ? field.options.map((option: string) => ({ value: option, label: option }))
            : undefined,
        }));
      } else if (typeof selectedProduct.itemTemplate === 'object' && selectedProduct.itemTemplate !== null) {
        // Si es un objeto, convertirlo a FormTemplate
        productTemplate = Object.entries(selectedProduct.itemTemplate).map(([key, value]: [string, any]) => ({
          name: key,
          label: generateLabel(key),
          type: (value as any).type || 'text',
          placeholder: generatePlaceholder(key, (value as any).type || 'text'),
          required: (value as any).required || false,
          options: (value as any).type === 'select' && (value as any).options 
            ? (value as any).options.map((option: string) => ({ value: option, label: option }))
            : undefined,
        }));
      }
    } catch (error) {
       console.error('Error procesando template de la categoría:', error);
      return baseItemFormTemplate;
    }
    
    // Combinar los campos base con los campos específicos de la categoría
    return [...baseItemFormTemplate, ...productTemplate];
  };

  const openDeleteModalWithDetails = async (item: any) => {
    try {
      // Obtener información detallada del item con nombres de dependencias
      const detailedItem = await getItemDetails(item.id);
      openDeleteModal(detailedItem);
    } catch (error) {
      console.error('Error obteniendo detalles del producto:', error);
      // Si falla, usar la información básica
      openDeleteModal(item);
    }
  };

  // Removed defaultActions to eliminate contextual dropdown
  // Double-click navigation is handled by onRowDoubleClick

  const defaultColumns = [
    {
      key: 'item-name',
      label: t('columns.productName'),
      enableSorting: true,
      sortingFn: (a: any, b: any) => a.original.name.localeCompare(b.original.name),
      render: (item: any) => (
        <div>
          <strong className="text-primary">{item.name}</strong>
          {item.id && (
            <div className="small text-muted mt-1">
              ID: {item.id}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'item-categories',
      label: t('columns.categories'),
      enableSorting: false,
      render: (item: any) => {
        // Durante el tutorial, mostrar badges estáticos en vez del CategoryEditor
        if (showTutorialExamples) {
          return (
            <div className="d-flex flex-wrap gap-1">
              {(item.categories || []).map((cat: { id: string; name: string }) => (
                <span key={cat.id} className="badge bg-secondary bg-opacity-10 text-secondary">
                  {cat.name}
                </span>
              ))}
            </div>
          );
        }

        const handleCategoryUpdate = (updatedCategories: Array<{ id: string; name: string }>) => {
          setItems((prevItems) =>
            prevItems.map((i) =>
              i.id === item.id
                ? { ...i, categories: updatedCategories }
                : i
            )
          );
        };

        return (
          <CategoryEditor
            itemId={item.id}
            categories={item.categories || []}
            onUpdate={handleCategoryUpdate}
            compact={true}
          />
        );
      },
    },
    {
      key: 'item-created',
      label: t('columns.creationDate'),
      enableSorting: true,
      sortingFn: (a: any, b: any) => {
        const dateA = new Date(a.original.createdAt);
        const dateB = new Date(b.original.createdAt);
        return dateA.getTime() - dateB.getTime();
      },
      render: (item: any) => {
        const date = new Date(item.createdAt);
        const localeString = locale === 'en' ? 'en-US' : 'es-ES';
        const formattedDate = date.toLocaleDateString(localeString, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        return (
          <div className="small">
            {formattedDate}
          </div>
        );
      },
    },
    {
      key: 'item-image',
      label: t('columns.image'),
      enableSorting: false,
      render: (item: any) => {
        return <ItemImageColumn item={item} />;
      },
    },
  ];

  if (isLoading) {
    return <LoadingOverlay/>;
  }

  // Wrapper para addItem que incluye el itemTemplate de la categoría
  const handleAddItem = async (formData: any) => {
    // Obtener el itemTemplate de la categoría seleccionada
    const selectedProduct = products.find(p => p.id === formData.categoryId);
    const categoryTemplate = selectedProduct?.itemTemplate || [];
    
    // Llamar a addItem con el itemTemplate correcto
    return await addItem(formData, categoryTemplate);
  };

  const handleItemCreated = (newItem: any) => {
    if (externalData !== undefined) {
      onDataChange?.();
    } else {
      setItems(prev => [newItem, ...prev]);
    }
  };

  const toggleField = (key: FieldKey) => {
    setSelectedFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const getCsvFile = async (selectedItemIds: string[], allItems: any[]) => {
    const ids = selectedItemIds.length ? selectedItemIds : allItems.map((it: any) => it.id);
    return exportItemsCsvWithFields(selectedFields, ids);
  };

  const tableContent = (
    <ItemsTableCustom
      title={defaultTitle}
      icon={"bi-list-columns"}
      initialData={filteredItems}
      formTemplate={!isLoading ? getSelectedProductTemplate() : undefined}
      onAddSubmit={handleAddItem}
      onItemCreated={handleItemCreated}
      uploadType="item"
      allowTemplateEditing={false}
      customColumns={[...defaultColumns, ...customColumns]}
      actions={customActions}
      onRowDoubleClick={!showTutorialExamples ? (item) => router.push(`/dashboard/items/${item.id}`) : undefined}
      rowActions={!showTutorialExamples ? [
        { icon: 'bi-trash', label: t('columns.delete'), onClick: openDeleteModalWithDetails, variant: 'outline-danger' },
      ] : []}
      filterPlaceholder={
        filterType === 'name' 
          ? t('searchByName')
          : filterType === 'id'
          ? t('searchById')
          : t('searchByCategory')
      }
      filterType={filterType}
      onFilterTypeChange={setFilterType}
      categories={products}
      addButtonLabel={t('addProduct')}
      onCategoryChange={setSelectedProductId}
      onExportCsvClick={() => setShowCsvExportModal(true)}
      exportCsvLabel={t('exportCsv')}
    />
  );

  // Obtener información de cascada usando la configuración centralizada
  const cascadeInfo = entityToDelete ? getCascadeInfo(entityToDelete, 'items') : undefined;

  return (
    <>
      <KycInfoBanner />

      {showBox && showDescription && (
        <Box>
          <h6 className="mb-2">{t('whatIsInventory')}</h6>
          <Divider />
          <p className="mb-0 text-muted">
            {t('inventoryDescription')}
          </p>
        </Box>
      )}

      <div className="mt-3" data-tour="items-table">
        {showBox ? <Box>{tableContent}</Box> : tableContent}
      </div>

      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={closeDeleteModal}
        onConfirm={handleDelete}
        title={t('deleteProduct')}
        message={t('confirmDeleteProduct', { name: entityToDelete?.name || '' })}
        cascadeInfo={cascadeInfo}
        isLoading={isDeleting}
      />

      <ItemSelectionModal
        show={showCsvExportModal}
        onHide={() => setShowCsvExportModal(false)}
        title={tExports('selectProductsAndFields')}
        previewFields={availableFields.filter(f => selectedFields.includes(f.key))}
        footer={(selectedItemIds, modalItems) => (
          <DownloadZipButton
            label={tExports('exportCsv')}
            iconClassName="bi bi-filetype-csv me-2"
            variant="primary"
            getZip={() => getCsvFile(selectedItemIds, modalItems)}
          />
        )}
      >
        <FieldSelector
          fields={availableFields}
          selected={selectedFields}
          onToggle={toggleField}
          idPrefix="csv-field"
        />
      </ItemSelectionModal>
    </>
  );
}
