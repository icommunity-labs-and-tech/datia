"use client";

import Box from '@/components/Box';
import GenericTable, { FormTemplate } from '@/components/GenericTable';
import LoadingOverlay from '@/components/Loading';
import { addStatusType, listStatusTypes, updateStatusType, deleteStatusType, getStatusType } from '@/actions/statusTypes';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { useDeleteEntity } from '@/hooks/useDeleteEntity';
import StatusTypeFieldBuilder, { StatusTypeFieldDefinition } from '@/components/StatusTypeFieldBuilder';
import { Button, Modal, Form, Alert } from 'react-bootstrap';
import { Divider } from '@/components/Divider';
import { useTranslations, useLocale } from 'next-intl';
import { useTutorialContext } from '@/lib/tutorial/TutorialProvider';
import { getTutorialStatusTypes } from '@/lib/tutorial/tutorialExampleData';

// Función helper para crear el template de status types con traducciones
const createStatusTypeFormTemplate = (tForms: (key: string) => string): FormTemplate => [
  { name: 'name', label: tForms('labels.name'), type: 'text' as const, placeholder: tForms('labels.statusTypeName'), required: true },
  { name: 'description', label: tForms('labels.description'), type: 'textarea' as const, placeholder: tForms('labels.statusTypeDescription'), required: false },
];

interface StatusTypesTableProps {
  title?: string;
  showBox?: boolean;
  onStatusTypeSelect?: (statusType: any) => void;
  customActions?: Array<{ label: string; onClick: (row: any) => void }>;
  customColumns?: Array<{ key: string; label: string; render: (statusType: any) => React.ReactNode }>;
}

export default function StatusTypesTable({ 
  title,
  showBox = true,
  onStatusTypeSelect,
  customActions = [],
  customColumns = [],
}: StatusTypesTableProps) {
  const t = useTranslations('tables');
  const tForms = useTranslations('forms');
  const tModals = useTranslations('modals.addItem');
  const locale = useLocale();
  const defaultTitle = title || t('statusTypes');
  const statusTypeFormTemplate = useMemo(() => createStatusTypeFormTemplate(tForms), [tForms]);
  const [statusTypes, setStatusTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [editingStatusType, setEditingStatusType] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', description: '', template: [] as StatusTypeFieldDefinition[] });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
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
  } = useDeleteEntity(deleteStatusType, {
    entityName: 'Tipo de estado',
    redirectPath: '/dashboard/status-types',
    onSuccess: () => {
      if (entityToDelete) {
        setStatusTypes(prev => prev.filter(st => st.id !== entityToDelete.id));
      }
    },
    onError: (error) => {
      alert(t('deleteStatusTypeError'));
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        if (showTutorialExamples) {
          setStatusTypes(getTutorialStatusTypes(organizationSector || 'fashion'));
          setIsLoading(false);
          return;
        }
        const data = await listStatusTypes();
        setStatusTypes(data);
      } catch (e) {
        console.error('Error loading status types:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [showTutorialExamples, organizationSector]);

  const handleEditStatusType = async (statusType: any) => {
    try {
      const fullStatusType = await getStatusType(statusType.id);
      setEditingStatusType(fullStatusType);
      setEditFormData({
        name: fullStatusType.name,
        description: fullStatusType.description,
        template: Array.isArray(fullStatusType.template) ? fullStatusType.template : []
      });
      setEditError(null);
    } catch (err) {
      console.error('Error cargando StatusType:', err);
      setEditError(t('loadStatusTypeError'));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingStatusType) return;
    
    setIsSavingEdit(true);
    setEditError(null);
    
    try {
      const updated = await updateStatusType(editingStatusType.id, {
        name: editFormData.name,
        description: editFormData.description,
        template: editFormData.template
      });
      
      setStatusTypes(prev => prev.map(st => st.id === updated.id ? updated : st));
      setEditingStatusType(null);
      setEditFormData({ name: '', description: '', template: [] });
    } catch (err: any) {
      setEditError(err.message || t('updateStatusTypeError'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const tCommon = useTranslations('common.actions');

  if (isLoading) return <LoadingOverlay />;

  const tableContent = (
    <GenericTable
      initialData={statusTypes}
      title={defaultTitle}
      icon="bi-collection"
      onRowDoubleClick={!showTutorialExamples ? (st) => router.push(`/dashboard/status-types/${st.id}`) : undefined}
      formTemplate={[]}
      onAddSubmit={async (formData: any) => {
        // El template viene del customFormContent a través del formState
        const created = await addStatusType(formData);
        setStatusTypes(prev => [created, ...prev]);
        return created;
      }}
      allowTemplateEditing={false}
      modalTitle={tModals('addStatusType')}
      customFormContent={({ formState, setFormState }) => {
        const template = formState.template || [];
        return (
          <div className="row g-3">
            {/* Columna izquierda: Nombre y Descripción */}
            <div className="col-md-5">
              <Form.Group className="mb-3">
                <Form.Label className="small fw-medium">{tForms('labels.name')}</Form.Label>
                <Form.Control
                  type="text"
                  value={formState.name || ''}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder={tForms('labels.statusTypeName')}
                  required
                />
              </Form.Group>
              <Form.Group>
                <Form.Label className="small fw-medium">{tForms('labels.description')}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={formState.description || ''}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder={tForms('labels.statusTypeDescription')}
                />
              </Form.Group>
            </div>

            {/* Columna derecha: Campos personalizados */}
            <div className="col-md-7">
              <StatusTypeFieldBuilder
                fields={template}
                onChange={(fields: StatusTypeFieldDefinition[]) => {
                  setFormState({ ...formState, template: fields });
                }}
              />
            </div>
          </div>
        );
      }}
      rowActions={!showTutorialExamples ? [
        { icon: 'bi-pencil', label: tCommon('edit'), onClick: handleEditStatusType, variant: 'outline-secondary' },
        { icon: 'bi-trash', label: tCommon('delete'), onClick: (row) => openDeleteModal(row), variant: 'outline-danger' },
      ] : []}
      customColumns={customColumns.length > 0 ? customColumns : [
        {
          key: 'name',
          label: t('columnLabels.name'),
          render: (statusType: any) => (
            <div className="fw-medium text-primary">{statusType.name}</div>
          )
        },
        {
          key: 'description',
          label: t('columnLabels.description'),
          render: (statusType: any) => (
            <div className="text-muted">{statusType.description || '-'}</div>
          )
        },
        {
          key: 'createdAt',
          label: t('columnLabels.creationDate'),
          render: (statusType: any) => {
            const localeString = locale === 'en' ? 'en-US' : 'es-ES';
            return (
              <span className="text-muted">
                {new Date(statusType.createdAt).toLocaleDateString(localeString, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            );
          }
        }
      ]}
    />
  );

  return (
    <>
      {showBox && (
        <Box>
          <h6 className="mb-2">{t('whatIsStatusTypes')}</h6>
          <Divider />
          <p className="mb-0 text-muted">
            {t('statusTypesDescription')}
          </p>
        </Box>
      )}

      <div data-tour="status-types-table">
        {showBox ? (
          <Box>
            {tableContent}
          </Box>
        ) : (
          tableContent
        )}
      </div>

      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={closeDeleteModal}
        onConfirm={handleDelete}
        title={t('deleteStatusType')}
        message={t('confirmDeleteStatusType', { name: entityToDelete?.name || '' })}
        isLoading={isDeleting}
      />

      {/* Modal para editar StatusType */}
      <Modal show={!!editingStatusType} onHide={() => setEditingStatusType(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t('editStatusType')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editError && (
            <Alert variant="danger" className="mb-3">
              {editError}
            </Alert>
          )}
          <Form>
            <div className="row g-3">
              {/* Columna izquierda: Nombre y Descripción */}
              <div className="col-md-5">
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-medium">{t('columnLabels.name')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label className="small fw-medium">{t('columnLabels.description')}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  />
                </Form.Group>
              </div>

              {/* Columna derecha: Campos personalizados */}
              <div className="col-md-7">
                <StatusTypeFieldBuilder
                  fields={editFormData.template}
                  onChange={(fields: StatusTypeFieldDefinition[]) => {
                    setEditFormData({ ...editFormData, template: fields });
                  }}
                />
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditingStatusType(null)}>
            {tCommon('cancel')}
          </Button>
          <Button variant="primary" onClick={handleSaveEdit} disabled={isSavingEdit}>
            {isSavingEdit ? tCommon('loading') : tCommon('save')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

