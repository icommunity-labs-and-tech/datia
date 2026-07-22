'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@/components/Box';
import LoadingOverlay from '@/components/Loading';
import { Divider } from '@/components/Divider';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { Button } from '@mantine/core';
import { useDeleteEntity } from '@/hooks/useDeleteEntity';
import { deleteUser, getUserById } from '@/actions/users';
import { useTranslations } from 'next-intl';

export default function UserDetailPage() {
  const t = useTranslations('userDetail');
  const tCommon = useTranslations('common.actions');
  const { id } = useParams();
  const router = useRouter();
  const userId = id as string;
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Wrapper para deleteUser que cumple con la interfaz esperada
  const deleteUserWrapper = async (id: string) => {
    const result = await deleteUser(id);
    return {
      success: result.success,
      message: result.success ? (result.message || t('deleteSuccess')) : (result.error || t('deleteError'))
    };
  };

  // Usar el hook refactorizado
  const {
    showDeleteModal,
    entityToDelete,
    isDeleting,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
  } = useDeleteEntity(deleteUserWrapper, {
    entityName: t('entityName'),
    redirectPath: '/dashboard/users',
    onSuccess: () => {
      router.push('/dashboard/users');
    },
    onError: () => {
      alert(t('deleteError'));
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getUserById(userId);
        if (result.success && result.user) {
          setUser(result.user);
        } else {
          console.error('Error al cargar usuario:', result.error);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    if (userId) load();
  }, [userId]);

  const openDeleteModalWithUser = () => {
    openDeleteModal(user);
  };

  if (isLoading) return <LoadingOverlay />;

  return (
    <>
      <Box>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center">
            <i className="bi bi-people-fill me-2" />
            <h4 className="mb-0">{t('title', { name: user?.name })}</h4>
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="default"
              size="xs"
              onClick={() => router.push(`/dashboard/users/${userId}/edit`)}
            >
              <i className="bi bi-pencil me-1"></i>
              {tCommon('edit')}
            </Button>
            <Button
              variant="light"
              color="red"
              size="xs"
              onClick={openDeleteModalWithUser}
            >
              <i className="bi bi-trash me-1"></i>
              {tCommon('delete')}
            </Button>
          </div>
        </div>
        <Divider />
        <p className="text-muted mb-0">{user?.email}</p>
      </Box>

      <Box>
        <h5>{t('info')}</h5>
        <div className="row">
          <div className="col-md-6">
            <p><strong>{t('role')}</strong> {t('roleAdmin')}</p>
          </div>
          <div className="col-md-6">
            <p><strong>{t('phone')}</strong> {user?.phone || t('notSpecified')}</p>
            <p><strong>{t('createdAt')}</strong> {new Date(user?.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </Box>

      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={closeDeleteModal}
        onConfirm={() => {
          if (entityToDelete) {
            handleDelete();
          }
        }}
        title={t('deleteTitle')}
        message={t('deleteMessage', {
          role: entityToDelete?.userType === 'admin' ? t('adminRole') : t('operatorRole'),
          name: entityToDelete?.name ?? '',
        })}
        isLoading={isDeleting}
      />
    </>
  );
}
