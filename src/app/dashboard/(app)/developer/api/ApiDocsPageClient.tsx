'use client';

import { useTranslations } from 'next-intl';
import Box from '@/components/Box';
import { Divider } from '@/components/Divider';
import '@/components/GenericTable/Toolbar/Toolbar.css';

export default function ApiDocsPageClient() {
  const t = useTranslations('developer.api');

  const capabilities = [
    { icon: 'bi-plus-circle', key: 'createProducts' },
    { icon: 'bi-patch-check', key: 'addStates' },
    { icon: 'bi-search', key: 'queryData' },
    { icon: 'bi-key', key: 'tokenAuth' },
  ] as const;

  const sandboxFeatures = [
    { icon: 'bi-shield-check', key: 'noRealData' },
    { icon: 'bi-clock-history', key: 'ephemeral' },
    { icon: 'bi-database-slash', key: 'noDb' },
    { icon: 'bi-check2-circle', key: 'realStatusTypes' },
  ] as const;

  return (
    <>
      {/* Intro */}
      <Box>
        <div className="d-flex align-items-start gap-3 mb-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 48, height: 48, background: 'var(--bs-info)', opacity: 0.9 }}
          >
            <i className="bi bi-code-slash text-white fs-4" />
          </div>
          <div>
            <h5 className="mb-1">{t('title')}</h5>
            <p className="text-muted mb-0">{t('subtitle')}</p>
          </div>
        </div>
        <Divider />
        <p className="text-muted mb-4">{t('description')}</p>
        <a
          href="/api/v1/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-info text-white px-4"
        >
          <i className="bi bi-box-arrow-up-right me-2" />
          {t('openDocs')}
        </a>
      </Box>

      {/* Capabilities */}
      <Box>
        <div className="table-toolbar mb-0">
          <div className="title-section">
            <i className="bi bi-lightning-charge" />
            <h4>{t('capabilities.title')}</h4>
          </div>
        </div>
        <Divider />
        <div className="row g-3">
          {capabilities.map(({ icon, key }) => (
            <div key={key} className="col-12 col-sm-6">
              <div className="d-flex align-items-start gap-2">
                <i className={`bi ${icon} text-info mt-1 flex-shrink-0`} />
                <div>
                  <strong className="d-block">{t(`capabilities.${key}.title`)}</strong>
                  <small className="text-muted">{t(`capabilities.${key}.description`)}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Box>

      {/* Sandbox */}
      <Box>
        <div className="table-toolbar mb-0">
          <div className="title-section">
            <i className="bi bi-box" />
            <h4>{t('sandbox.title')}</h4>
          </div>
          <div className="controls-section">
            <span className="badge bg-success">{t('sandbox.badge')}</span>
          </div>
        </div>
        <Divider />
        <p className="text-muted mb-4">{t('sandbox.description')}</p>
        <div className="row g-3 mb-4">
          {sandboxFeatures.map(({ icon, key }) => (
            <div key={key} className="col-12 col-sm-6">
              <div className="d-flex align-items-start gap-2">
                <i className={`bi ${icon} text-success mt-1 flex-shrink-0`} />
                <div>
                  <strong className="d-block">{t(`sandbox.features.${key}.title`)}</strong>
                  <small className="text-muted">{t(`sandbox.features.${key}.description`)}</small>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h6 className="mb-3">{t('sandbox.howTo.title')}</h6>
        <ol className="mb-4 ps-3 d-flex flex-column gap-2">
          {(['step1', 'step2', 'step3', 'step4'] as const).map((step) => (
            <li key={step} className="text-muted small">
              <span dangerouslySetInnerHTML={{ __html: t.raw(`sandbox.howTo.${step}`) as string }} />
            </li>
          ))}
        </ol>

        <a
          href="/api/v1/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-success px-4"
        >
          <i className="bi bi-box-arrow-up-right me-2" />
          {t('sandbox.howTo.cta')}
        </a>
      </Box>

      {/* Authentication reminder */}
      <Box>
        <div className="table-toolbar mb-0">
          <div className="title-section">
            <i className="bi bi-key" />
            <h4>{t('auth.title')}</h4>
          </div>
        </div>
        <Divider />
        <p className="text-muted mb-3">{t('auth.description')}</p>
        <div className="bg-dark rounded-3 p-3 font-monospace small text-white">
          Authorization: Bearer {'<tu-token>'}
        </div>
        <p className="text-muted mt-3 mb-0 small">
          <i className="bi bi-info-circle me-1" />
          {t('auth.hint')}
          {' '}
          <a href="/dashboard/developer/auth" className="text-info">
            {t('auth.hintLink')}
          </a>
        </p>
      </Box>
    </>
  );
}
