'use client';

import React from 'react';
import { Modal, Button, Alert, Form } from 'react-bootstrap';
import { useTranslations } from 'next-intl';

interface PasswordModalProps {
  show: boolean;
  onHide: () => void;
  user: {
    name: string;
    email: string;
    temporaryPassword: string;
  } | null;
}

export default function PasswordModal({ show, onHide, user }: PasswordModalProps) {
  const t = useTranslations('modals.password');
  const [copied, setCopied] = React.useState(false);

  const handleCopyPassword = async () => {
    if (user?.temporaryPassword) {
      try {
        await navigator.clipboard.writeText(user.temporaryPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Error copying to clipboard:', err);
      }
    }
  };

  const handleCopyEmail = async () => {
    if (user?.email) {
      try {
        await navigator.clipboard.writeText(user.email);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Error copying to clipboard:', err);
      }
    }
  };

  if (!user) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-person-check"></i>
          {t('title')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="success" className="mb-4">
          <Alert.Heading>
            <i className="bi bi-check-circle me-2"></i>
            {t('successMessage')}
          </Alert.Heading>
          <p className="mb-0">
            {t('userCreated', { name: user.name, email: user.email })}
          </p>
        </Alert>

        <div className="mb-4">
          <h6 className="mb-3">
            <i className="bi bi-key me-2"></i>
            {t('credentialsTitle')}
          </h6>
          
          <div className="row">
            <div className="col-md-6 mb-3">
              <Form.Label className="fw-bold">{t('email')}</Form.Label>
              <div className="input-group">
                <Form.Control
                  type="text"
                  value={user.email}
                  readOnly
                  className="bg-light"
                />
                <Button
                  variant="outline-secondary"
                  onClick={handleCopyEmail}
                  title={t('copyEmail')}
                >
                  <i className="bi bi-clipboard"></i>
                </Button>
              </div>
            </div>
            
            <div className="col-md-6 mb-3">
              <Form.Label className="fw-bold">{t('temporaryPassword')}</Form.Label>
              <div className="input-group">
                <Form.Control
                  type="text"
                  value={user.temporaryPassword}
                  readOnly
                  className="bg-light font-monospace"
                />
                <Button
                  variant="outline-secondary"
                  onClick={handleCopyPassword}
                  title={t('copyPassword')}
                >
                  <i className="bi bi-clipboard"></i>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Alert variant="warning">
          <Alert.Heading>
            <i className="bi bi-exclamation-triangle me-2"></i>
            {t('important')}
          </Alert.Heading>
          <ul className="mb-0">
            <li>{t('temporaryWarning')}</li>
            <li>{t('shareSecurely')}</li>
            <li>{t('canChangePassword')}</li>
          </ul>
        </Alert>

        {copied && (
          <Alert variant="info" className="mt-3">
            <i className="bi bi-check-circle me-2"></i>
            {t('copied')}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>
          <i className="bi bi-check me-2"></i>
          {t('understood')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
