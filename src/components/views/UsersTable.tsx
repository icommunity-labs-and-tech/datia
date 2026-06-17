'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal, Form, Badge, Alert } from 'react-bootstrap';
import GenericTable from '@/components/GenericTable';
import { getUsers, createUser, deleteUser, updateUser } from '@/actions/users';
import { getListColumnPresets } from '@/components/GenericTable/useUnifiedColumns';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { useDeleteEntity } from '@/hooks/useDeleteEntity';
import Box from '@/components/Box';
import type { FormTemplate } from '@/components/GenericTable';
// import BoxTitle from '@/components/BoxTitle';
import PasswordModal from '@/components/PasswordModal';
import { Divider } from '@/components/Divider';
import { useTranslations, useLocale } from 'next-intl';

// Función helper para crear el template de usuarios con traducciones
const createUserFormTemplate = (tForms: (key: string) => string): FormTemplate => [
  { name: 'name', label: tForms('labels.name'), type: 'text', placeholder: tForms('labels.userName') },
  { name: 'email', label: tForms('labels.email'), type: 'text', placeholder: tForms('labels.userEmail') },
  { 
    name: 'role', 
    label: tForms('labels.role'), 
    type: 'select', 
    placeholder: tForms('labels.selectRole'),
    options: [
      { value: 'USER', label: tForms('roles.operator') },
      { value: 'ADMIN', label: tForms('roles.administrator') }
    ]
  },
  { name: 'notes', label: tForms('labels.notes'), type: 'text', placeholder: tForms('labels.additionalNotes') },
];

interface UsersTableProps {
  title?: string;
  showBox?: boolean;
  onUserSelect?: (user: any) => void;
  customActions?: Array<{ label: string; onClick: (row: any) => void }>;
  customColumns?: Array<{ key: string; label: string; render: (user: any) => React.ReactNode }>;
  allowTemplateEditing?: boolean;
  externalData?: any[];
  onDataChange?: () => void;
  showDescription?: boolean;
}

export default function UsersTable({
  title,
  showBox = true,
  onUserSelect,
  customActions = [],
  customColumns = [],
  allowTemplateEditing = true,
  externalData,
  onDataChange,
  showDescription = true,
}: UsersTableProps) {
  const t = useTranslations('tables');
  const tModals = useTranslations('modals');
  const tForms = useTranslations('forms');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const defaultTitle = title || t('users');
  const userFormTemplate = useMemo(() => createUserFormTemplate(tForms), [tForms]);
  const listColumnPresets = useMemo(() => getListColumnPresets(t), [t]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newUserCredentials, setNewUserCredentials] = useState<{
    name: string;
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  // Wrapper para deleteUser que cumple con la interfaz esperada
  const deleteUserWrapper = async (id: string) => {
    const result = await deleteUser(id);
    return {
      success: result.success,
      message: result.success ? (result.message || 'Usuario eliminado correctamente') : (result.error || 'Error al eliminar usuario')
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
    entityName: 'Usuario',
    redirectPath: '/dashboard/users',
    onSuccess: () => {
      if (externalData !== undefined) {
        onDataChange?.();
      } else if (entityToDelete) {
        setUsers(prev => prev.filter(user => user.id !== entityToDelete.id));
      }
    },
    onError: (error) => {
      alert(t('deleteUserError'));
    },
  });

  useEffect(() => {
    if (externalData !== undefined) {
      setIsLoading(false);
      return;
    }
    const load = async () => {
      try {
        const result = await getUsers();
        if (result.success) {
          setUsers(result.users);
        } else {
          console.error('Error loading users:', result.error);
          if (result.error?.includes('No autorizado') || result.error?.includes('Solo los administradores')) {
            window.location.href = '/auth/admin/login';
          }
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [externalData]);

  const handleAddUser = async (formData: any) => {
    try {
      const formDataObj = new FormData();
      Object.keys(formData).forEach(key => {
        formDataObj.append(key, formData[key]);
      });
      
      const result = await createUser(formDataObj);
      if (result.success && result.user) {
        if (externalData !== undefined) {
          onDataChange?.();
        } else {
          setUsers(prev => [result.user, ...prev]);
        }

        // Mostrar modal con credenciales si hay contraseña temporal
        if (result.user.temporaryPassword) {
          setNewUserCredentials({
            name: result.user.name,
            email: result.user.email,
            temporaryPassword: result.user.temporaryPassword
          });
          setShowPasswordModal(true);
        }
        
        return result.user;
      } else {
        throw new Error(result.error || 'Error al crear usuario');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  };

  const handleUserCreated = (user: any) => {
    // Opcional: lógica adicional después de crear usuario
  };

  const openDeleteModalWithUser = (user: any) => {
    openDeleteModal(user);
  };



  const userColumns = listColumnPresets.users.filter(col => col.key !== 'actions').map(col => ({
    key: col.key,
    label: col.label,
    enableSorting: col.sortable !== false, // Por defecto true, a menos que se especifique false
    sortingFn: col.sortable !== false ? (a: any, b: any) => {
      const aValue = a.original[col.key];
      const bValue = b.original[col.key];
      
      // Ordenamiento especial para campos específicos
      if (col.key === 'createdAt') {
        const dateA = new Date(aValue);
        const dateB = new Date(bValue);
        return dateA.getTime() - dateB.getTime();
      }
      
      return String(aValue).localeCompare(String(bValue));
    } : undefined,
    render: (row: any) => {
      const value = row[col.key];
      switch (col.key) {
        case 'role':
          return (
            <span className={`badge ${value === 'ADMIN' ? 'bg-primary' : 'bg-info'}`}>
              {value === 'ADMIN' ? tForms('roles.administrator') : tForms('roles.operator')}
            </span>
          );
        case 'createdAt':
          const localeString = locale === 'en' ? 'en-US' : 'es-ES';
          return new Date(value).toLocaleDateString(localeString);
        default:
          return value || '-';
      }
    }
  }));

  if (isLoading) {
    return showBox ? (
      <Box>
          <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">{tCommon('loading')}</span>
          </div>
          <p className="mt-2">{t('loadingUsers')}</p>
        </div>
      </Box>
    ) : (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">{tCommon('loading')}</span>
        </div>
        <p className="mt-2">{t('loadingUsers')}</p>
      </div>
    );
  }

  const tableContent = (
    <>
      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'danger'} className="mb-3">
          {message.text}
        </Alert>
      )}

      <GenericTable
        initialData={externalData !== undefined ? externalData : users}
        title={defaultTitle}
        icon="bi-people-fill"
        formTemplate={userFormTemplate}
        onAddSubmit={handleAddUser}
        onItemCreated={handleUserCreated}
        customColumns={customColumns.length > 0 ? customColumns : userColumns}
        allowTemplateEditing={false}
        filterPlaceholder={t('filterUserPlaceholder')}
        addButtonLabel={t('addUser')}
        onRowDoubleClick={(row) => router.push(`/dashboard/users/${row.id}`)}
        rowActions={[
          { icon: 'bi-pencil', label: t('columns.edit'), onClick: (row) => router.push(`/dashboard/users/${row.id}/edit`), variant: 'outline-secondary' },
          { icon: 'bi-trash', label: t('columns.delete'), onClick: openDeleteModalWithUser, variant: 'outline-danger' },
        ]}
      />

      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={closeDeleteModal}
        onConfirm={() => {
          if (entityToDelete) {
            handleDelete();
          }
        }}
        title={tModals('deleteUser')}
        message={tModals('confirmDeleteUser', { name: entityToDelete?.name || '' })}
        isLoading={isDeleting}
      />


      {/* Modal de Contraseña Temporal */}
      <PasswordModal
        show={showPasswordModal}
        onHide={() => {
          setShowPasswordModal(false);
          setNewUserCredentials(null);
        }}
        user={newUserCredentials}
      />
    </>
  );

  return (
    <>
      {showBox && showDescription && (
        <Box>
          <h6 className="mb-2">{t('whatIsUserManagement')}</h6>
          <Divider />
          <p className="mb-0 text-muted">
            {t('usersDescription')}
          </p>
        </Box>
      )}

      {showBox ? (
        <Box>
          {tableContent}
        </Box>
      ) : (
        tableContent
      )}
    </>
  );
}
