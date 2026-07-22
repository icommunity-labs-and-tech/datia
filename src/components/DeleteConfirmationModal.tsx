'use client';

import React from 'react';
import { Modal, Button, Alert, Group, Loader, Text } from '@mantine/core';
import { useTranslations } from 'next-intl';

interface CascadeInfo {
  statusTypesDeleted?: number;
  itemsDeleted?: number;
  statesDeleted?: number;
  statusTypeNames?: string[];
  itemNames?: string[];
  stateTitles?: string[];
}

interface DeleteConfirmationModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  cascadeInfo?: CascadeInfo;
  isLoading?: boolean;
}

export default function DeleteConfirmationModal({
  show,
  onHide,
  onConfirm,
  title,
  message,
  cascadeInfo,
  isLoading = false
}: DeleteConfirmationModalProps) {
  const t = useTranslations('modals');
  const tCommon = useTranslations('common.actions');
  const tDeleteConfirmation = useTranslations('deleteConfirmation');
  const hasCascade = cascadeInfo && Object.values(cascadeInfo).some(count => count && count > 0);

  const renderCascadeWarning = () => {
    if (!hasCascade) return null;

    const cascadeItems = [];

    // Tipos de estado
    if (cascadeInfo?.statusTypesDeleted && cascadeInfo.statusTypesDeleted > 0) {
      if (cascadeInfo.statusTypeNames && cascadeInfo.statusTypeNames.length > 0) {
        const displayNames = cascadeInfo.statusTypeNames.slice(0, 3);
        const remaining = cascadeInfo.statusTypesDeleted - displayNames.length;

        let text = displayNames.join(', ');
        if (remaining > 0) {
          const plural = remaining !== 1 ? 's' : '';
          text += ` ${tDeleteConfirmation('statusTypesMore', { count: remaining, plural })}`;
        }
        cascadeItems.push(text);
      } else {
        const plural = cascadeInfo.statusTypesDeleted !== 1 ? 's' : '';
        cascadeItems.push(tDeleteConfirmation('statusTypesCount', { count: cascadeInfo.statusTypesDeleted, plural }));
      }
    }

    // Items
    if (cascadeInfo?.itemsDeleted && cascadeInfo.itemsDeleted > 0) {
      if (cascadeInfo.itemNames && cascadeInfo.itemNames.length > 0) {
        const displayNames = cascadeInfo.itemNames.slice(0, 3);
        const remaining = cascadeInfo.itemsDeleted - displayNames.length;

        let text = displayNames.join(', ');
        if (remaining > 0) {
          const plural = remaining !== 1 ? 's' : '';
          text += ` ${tDeleteConfirmation('itemsMore', { count: remaining, plural })}`;
        }
        cascadeItems.push(text);
      } else {
        const plural = cascadeInfo.itemsDeleted !== 1 ? 's' : '';
        cascadeItems.push(tDeleteConfirmation('itemsCount', { count: cascadeInfo.itemsDeleted, plural }));
      }
    }

    // Estados
    if (cascadeInfo?.statesDeleted && cascadeInfo.statesDeleted > 0) {
      if (cascadeInfo.stateTitles && cascadeInfo.stateTitles.length > 0) {
        const displayNames = cascadeInfo.stateTitles.slice(0, 3);
        const remaining = cascadeInfo.statesDeleted - displayNames.length;

        let text = displayNames.join(', ');
        if (remaining > 0) {
          const plural = remaining !== 1 ? 's' : '';
          text += ` ${tDeleteConfirmation('statesMore', { count: remaining, plural })}`;
        }
        cascadeItems.push(text);
      } else {
        const plural = cascadeInfo.statesDeleted !== 1 ? 's' : '';
        cascadeItems.push(tDeleteConfirmation('statesCount', { count: cascadeInfo.statesDeleted, plural }));
      }
    }

    return (
      <Alert color="yellow" mt="md">
        <Text fw={600} size="sm">{t('cascadeWarning')}</Text>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          {cascadeItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </Alert>
    );
  };

  return (
    <Modal
      opened={show}
      onClose={onHide}
      centered
      title={<Group gap={6}><i className="bi bi-trash3" />{title}</Group>}
    >
      <Text size="sm">{message}</Text>
      {renderCascadeWarning()}
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onHide} disabled={isLoading}>
          {tCommon('cancel')}
        </Button>
        <Button color="red" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader size="xs" color="white" mr={8} />
              {t('deleting')}
            </>
          ) : (
            t('confirmDelete')
          )}
        </Button>
      </Group>
    </Modal>
  );
}
