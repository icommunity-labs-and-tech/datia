'use client';

import React from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
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
      <Alert variant="warning" className="mt-3">
        <strong>{t('cascadeWarning')}</strong>
        <ul className="mb-0 mt-2">
          {cascadeItems.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </Alert>
    );
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title><i className="bi bi-trash3"></i>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{message}</p>
        {renderCascadeWarning()}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isLoading}>
          {tCommon('cancel')}
        </Button>
        <Button 
          variant="danger" 
          onClick={onConfirm} 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              {t('deleting')}
            </>
          ) : (
            t('confirmDelete')
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
