'use client';

import { Card, Alert, Button, Spinner } from 'react-bootstrap';
import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { updateOrgLogo } from '@/actions/organizations/update-org-logo';
import { deleteOrgLogo } from '@/actions/organizations/delete-org-logo';

interface Props {
  logoUrl: string | null;
  onLogoChange: (url: string | null) => void;
}

export default function OrgLogoCard({ logoUrl, onLogoChange }: Props) {
  const t = useTranslations('profile');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    const formData = new FormData();
    formData.append('logo', file);
    const result = await updateOrgLogo(formData);
    setUploading(false);
    if (result.error) {
      setFeedback({ type: 'error', message: result.error });
    } else {
      onLogoChange(result.logoUrl ?? null);
      setFeedback({ type: 'success', message: t('branding.uploadSuccess') });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async () => {
    setDeleting(true);
    setFeedback(null);
    const result = await deleteOrgLogo();
    setDeleting(false);
    if (result.error) {
      setFeedback({ type: 'error', message: result.error });
    } else {
      onLogoChange(null);
      setFeedback({ type: 'success', message: t('branding.deleteSuccess') });
    }
  };

  return (
    <Card className="mb-3">
      <Card.Body>
        <h6 className="card-title mb-3">{t('branding.currentLogo')}</h6>

        {logoUrl ? (
          <div className="mb-3">
            <Image
              src={logoUrl}
              alt="Logo de la organización"
              width={180}
              height={60}
              style={{ objectFit: 'contain', background: '#f8f9fa', borderRadius: 8, padding: 8 }}
              unoptimized
            />
          </div>
        ) : (
          <p className="text-muted small mb-3">
            <i className="bi bi-image me-1" />
            {t('branding.noLogo')}
          </p>
        )}

        <p className="text-muted small mb-3">
          <i className="bi bi-info-circle me-1" />
          {t('branding.formatHint')}
        </p>

        <div className="d-flex gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="d-none"
            onChange={handleUpload}
          />
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || deleting}
          >
            {uploading ? (
              <><Spinner size="sm" className="me-1" />{t('branding.uploading')}</>
            ) : (
              <><i className="bi bi-upload me-1" />{t('branding.uploadLogo')}</>
            )}
          </Button>

          {logoUrl && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleDelete}
              disabled={uploading || deleting}
            >
              {deleting ? (
                <><Spinner size="sm" className="me-1" />{t('branding.deleting')}</>
              ) : (
                <><i className="bi bi-trash me-1" />{t('branding.deleteLogo')}</>
              )}
            </Button>
          )}
        </div>

        {feedback && (
          <Alert variant={feedback.type === 'success' ? 'success' : 'danger'} className="mt-3 mb-0 py-2 small">
            <i className={`bi bi-${feedback.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`} />
            {feedback.message}
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
}
