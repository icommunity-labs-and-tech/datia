'use client';

import { Card, Button } from 'react-bootstrap';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  slug: string;
}

export default function OrgLoginUrlsCard({ slug }: Props) {
  const t = useTranslations('profile');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopy = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(key);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <Card className="mb-3">
      <Card.Body>
        <h6 className="card-title mb-1">{t('branding.loginUrls')}</h6>
        <p className="text-muted small mb-3">{t('branding.loginUrlsDescription')}</p>

        {(['admin'] as const).map(role => {
          const url = `${origin}/org/${slug}/${role}`;
          return (
            <div key={role} className="mb-3">
              <label className="form-label small fw-semibold text-secondary mb-1">
                {t('branding.loginUrlAdmin')}
              </label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={url}
                  className="form-control form-control-sm"
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: '#f8fafc' }}
                  onFocus={e => e.target.select()}
                />
                <Button
                  variant={copiedUrl === role ? 'success' : 'outline-secondary'}
                  size="sm"
                  style={{ whiteSpace: 'nowrap', minWidth: 90 }}
                  onClick={() => handleCopy(url, role)}
                >
                  <i className={`bi bi-${copiedUrl === role ? 'check' : 'clipboard'} me-1`} />
                  {copiedUrl === role ? t('branding.loginUrlCopied') : 'Copiar'}
                </Button>
              </div>
            </div>
          );
        })}
      </Card.Body>
    </Card>
  );
}
