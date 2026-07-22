'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Box from '@/components/Box';
import BoxTitle from '@/components/BoxTitle';
import LoadingOverlay from '@/components/Loading';
import { Divider } from '@/components/Divider';
import { getStatusType, deleteStatusType } from '@/actions/statusTypes';
import { getStates } from '@/actions/states';
import { Button } from '@mantine/core';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { useDeleteEntity } from '@/hooks/useDeleteEntity';
import GenericTable from '@/components/GenericTable';

export default function StatusTypeDetailPage() {
  const t = useTranslations('common');
  const tTables = useTranslations('tables');
  const { id } = useParams();
  const router = useRouter();
  const statusTypeId = id as string;
  const [statusType, setStatusType] = useState<any>(null);
  const [states, setStates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    showDeleteModal,
    entityToDelete,
    isDeleting,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
  } = useDeleteEntity(deleteStatusType, {
    entityName: tTables('statusTypeDetail.deleteTitle'),
    redirectPath: '/dashboard/status-types',
    onSuccess: () => {
      router.push('/dashboard/status-types');
    },
    onError: () => {
      alert(tTables('statusTypeDetail.deleteError'));
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [stType, statesData] = await Promise.all([
          getStatusType(statusTypeId),
          getStates()
        ]);
        setStatusType(stType);
        // Filtrar estados que usan este tipo de estado
        const filteredStates = statesData.filter((s: any) => s.statusTypeId === statusTypeId);
        setStates(filteredStates);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    if (statusTypeId) load();
  }, [statusTypeId]);

  if (isLoading) return <LoadingOverlay />;

  if (!statusType) {
    return (
      <Box>
        <BoxTitle message={tTables('statusTypes')} />
        <p className="text-danger mb-0">{tTables('statusTypeDetail.notFound')}</p>
      </Box>
    );
  }

  return (
    <>
      <Box>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center">
            <i className="bi bi-collection me-2" />
            <h4 className="mb-0">{tTables('statusTypeDetail.pageTitle', { name: statusType?.name })}</h4>
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="default"
              size="xs"
              onClick={() => router.push(`/dashboard/status-types/${statusTypeId}/edit`)}
            >
              <i className="bi bi-pencil me-1"></i>
              {t('actions.edit')}
            </Button>
            <Button
              variant="light"
              color="red"
              size="xs"
              onClick={() => openDeleteModal(statusType)}
            >
              <i className="bi bi-trash me-1"></i>
              {t('actions.delete')}
            </Button>
          </div>
        </div>
        <Divider />
        <p className="text-muted mb-0">{statusType?.description || t('noDescription')}</p>
      </Box>

      {statusType.template && Array.isArray(statusType.template) && statusType.template.length > 0 && (
        <Box>
          <div className="d-flex align-items-center mb-3">
            <i className="bi bi-card-list me-2" />
            <h5 className="mb-0">{tTables('statusTypeDetail.fields')}</h5>
          </div>
          <Divider />
          <div className="row g-3">
            {statusType.template.map((field: any, idx: number) => (
              <div key={idx} className="col-12 col-md-6">
                <div className="d-flex justify-content-between border rounded p-2">
                  <span className="text-muted">{field.label || field.name || tTables('statusTypeDetail.field')}</span>
                  <span>{field.type || 'text'}</span>
                </div>
              </div>
            ))}
          </div>
        </Box>
      )}

      <Box>
        <GenericTable
          title={tTables('statusTypeDetail.statesUsingType', { count: states.length })}
          icon="bi-list-columns"
          initialData={states}
          customColumns={[
            {
              key: 'title',
              label: tTables('statusTypeDetail.columns.title'),
              render: (state: any) => (
                <div>
                  <div className="fw-medium text-primary">{state.title}</div>
                  {state.description && (
                    <div className="text-muted small">{state.description}</div>
                  )}
                </div>
              )
            },
            {
              key: 'itemId',
              label: tTables('statusTypeDetail.columns.product'),
              render: (state: any) => (
                <button
                  className="btn btn-link p-0 text-primary"
                  onClick={() => router.push(`/dashboard/items/${state.itemId}`)}
                >
                  {state.itemId}
                </button>
              )
            },
            {
              key: 'createdAt',
              label: tTables('statusTypeDetail.columns.created'),
              render: (state: any) => (
                <span className="text-muted">
                  {new Date(state.createdAt).toLocaleDateString()}
                </span>
              )
            }
          ]}
        />
      </Box>

      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={closeDeleteModal}
        onConfirm={handleDelete}
        title={tTables('statusTypeDetail.deleteTitle')}
        message={tTables('statusTypeDetail.deleteMessage', { name: entityToDelete?.name || '' })}
        isLoading={isDeleting}
      />
    </>
  );
}

