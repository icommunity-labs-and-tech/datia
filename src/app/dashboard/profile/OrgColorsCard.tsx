'use client';

import { Card, Alert, Button, Spinner, Row, Col } from 'react-bootstrap';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { updateOrgBranding } from '@/actions/organizations/update-org-branding';
import LoginPreview from '@/components/auth/LoginPreview';

interface Props {
  logoUrl: string | null;
  orgName: string;
  initialColorPrimary: string;
  initialColorSecondary: string;
}

export default function OrgColorsCard({ logoUrl, orgName, initialColorPrimary, initialColorSecondary }: Props) {
  const t = useTranslations('profile');
  const [colorPrimary, setColorPrimary] = useState(initialColorPrimary);
  const [colorSecondary, setColorSecondary] = useState(initialColorSecondary);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    const result = await updateOrgBranding({
      brandColorPrimary: colorPrimary || null,
      brandColorSecondary: colorSecondary || null,
    });
    setSaving(false);
    if (result.error) {
      setFeedback({ type: 'error', message: result.error });
    } else {
      setFeedback({ type: 'success', message: t('branding.colorsSuccess') });
    }
  };

  return (
    <Card className="mb-3">
      <Card.Body>
        <h6 className="card-title mb-3">{t('branding.colors')}</h6>

        <Row className="g-4">
          <Col md={6}>
            {logoUrl && (
              <div className="mb-3 p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 120 }}>
                <Image src={logoUrl} alt="Logo" width={120} height={40} style={{ objectFit: 'contain', maxWidth: '100%' }} unoptimized />
              </div>
            )}

            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary mb-1">
                {t('branding.colorPrimary')}
                <span className="text-muted fw-normal ms-1 d-block" style={{ fontSize: '0.75rem' }}>{t('branding.colorPrimaryHint')}</span>
              </label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="color"
                  value={colorPrimary}
                  onChange={e => setColorPrimary(e.target.value)}
                  style={{ width: 40, height: 36, border: '1.5px solid #dee2e6', borderRadius: 8, cursor: 'pointer', padding: 2 }}
                />
                <input
                  type="text"
                  value={colorPrimary}
                  onChange={e => setColorPrimary(e.target.value)}
                  maxLength={7}
                  style={{ width: 100, fontSize: '0.85rem', fontFamily: 'monospace' }}
                  className="form-control form-control-sm"
                />
                <Button variant="link" size="sm" className="text-muted p-0" onClick={() => setColorPrimary('#0f172a')} title={t('branding.colorsReset')}>
                  <i className="bi bi-arrow-counterclockwise" />
                </Button>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-semibold text-secondary mb-1">
                {t('branding.colorSecondary')}
                <span className="text-muted fw-normal ms-1 d-block" style={{ fontSize: '0.75rem' }}>{t('branding.colorSecondaryHint')}</span>
              </label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="color"
                  value={colorSecondary || colorPrimary}
                  onChange={e => setColorSecondary(e.target.value)}
                  style={{ width: 40, height: 36, border: '1.5px solid #dee2e6', borderRadius: 8, cursor: 'pointer', padding: 2 }}
                />
                <input
                  type="text"
                  value={colorSecondary}
                  onChange={e => setColorSecondary(e.target.value)}
                  maxLength={7}
                  placeholder="#opcional"
                  style={{ width: 100, fontSize: '0.85rem', fontFamily: 'monospace' }}
                  className="form-control form-control-sm"
                />
                <Button variant="link" size="sm" className="text-muted p-0" onClick={() => setColorSecondary('')} title={t('branding.colorsReset')}>
                  <i className="bi bi-arrow-counterclockwise" />
                </Button>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3 flex-wrap">
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><Spinner size="sm" className="me-1" />{t('branding.colorsSaving')}</>
                  : <><i className="bi bi-palette me-1" />{t('branding.colorsSave')}</>
                }
              </Button>
              {feedback && (
                <Alert variant={feedback.type === 'success' ? 'success' : 'danger'} className="mb-0 py-1 px-3 small">
                  <i className={`bi bi-${feedback.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`} />
                  {feedback.message}
                </Alert>
              )}
            </div>
          </Col>

          <Col md={6}>
            <p className="text-muted small mb-2">
              <i className="bi bi-eye me-1" />Preview
            </p>
            <LoginPreview
              logoUrl={logoUrl}
              orgName={orgName}
              colorPrimary={colorPrimary}
              colorSecondary={colorSecondary}
            />
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}
