'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@mantine/core';
import Box from '@/components/Box';
import BoxTitle from '@/components/BoxTitle';
import LoadingOverlay from '@/components/Loading';
import { Divider } from '@/components/Divider';
import MultipleImageDisplay from '@/components/MultipleImageDisplay';
import { getState } from '@/actions/states';
import { getStatusType } from '@/actions/statusTypes';
import { useTranslations, useLocale } from 'next-intl';

export default function StateDetailPage() {
  const t = useTranslations('states');
  const locale = useLocale();
  const { id } = useParams();
  const stateId = id as string;
  const [stateData, setStateData] = useState<any>(null);
  const [statusType, setStatusType] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const st = await getState(stateId);
        setStateData(st);
        if (st?.statusTypeId) {
          try {
            const stType = await getStatusType(st.statusTypeId);
            setStatusType(stType);
          } catch {}
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    if (stateId) load();
  }, [stateId]);

  if (isLoading) return <LoadingOverlay />;

  if (!stateData) {
    return (
      <Box>
        <BoxTitle message={t('title')} />
        <p className="text-danger mb-0">{t('notFound')}</p>
      </Box>
    );
  }

  const rawFields = Array.isArray(stateData?.templateConfig?.fields)
    ? (stateData.templateConfig.fields as Array<{ label?: string; name?: string; value?: string }>)
    : [];
  const fieldsWithValue = rawFields.filter(f => typeof f?.value === 'string' && f.value.trim().length > 0);
  const hasDescription = typeof stateData?.description === 'string' && stateData.description.trim().length > 0;
  const imageUrls = Array.isArray(stateData?.imageUrls) ? (stateData.imageUrls as string[]).filter(u => !!u) : [];

  return (
    <>
      <Box>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center">
            <i className="bi bi-flag me-2" />
            <h4 className="mb-0">{t('title')}: {stateData.title || stateId}</h4>
          </div>
        </div>
        <Divider />
        <div className="d-flex flex-wrap gap-3 align-items-center">
          <div>
            <span className="text-muted d-block small">{t('type')}</span>
            <Badge color="datiaBlue" variant="light">{statusType?.name || '—'}</Badge>
          </div>
          <div>
            <span className="text-muted d-block small">{t('date')}</span>
            <span>{new Date(stateData.createdAt).toLocaleString(locale === 'en' ? 'en-US' : 'es-ES')}</span>
          </div>
          <div>
            <span className="text-muted d-block small">{t('backed')}</span>
            <Badge color={stateData.backed ? 'green' : 'gray'}>
              {stateData.backed ? t('yes') : t('no')}
            </Badge>
          </div>
          <div>
            <span className="text-muted d-block small">{t('evidenceId')}</span>
            <span>{stateData.evidenceID || '—'}</span>
          </div>
        </div>
      </Box>

      {hasDescription && (
        <Box>
          <h6 className="mb-2">{t('description')}</h6>
          <Divider />
          <p className="mb-0 text-muted" style={{ whiteSpace: 'pre-wrap' }}>
            {stateData.description}
          </p>
        </Box>
      )}

      {fieldsWithValue.length > 0 && (
        <Box>
          <h6 className="mb-2">{t('fields')}</h6>
          <Divider />
          <div className="row g-3">
            {fieldsWithValue.map((f, idx) => (
              <div key={idx} className="col-12 col-md-6">
                <div className="d-flex justify-content-between border rounded p-2">
                  <span className="text-muted">{f.label || f.name || t('field')}</span>
                  <span>{f.value || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </Box>
      )}

      {imageUrls.length > 0 && (
        <Box>
          <h6 className="mb-2">{t('photos')}</h6>
          <Divider />
          <div className="d-flex align-items-center" style={{ minHeight: '24px' }}>
            <MultipleImageDisplay imageUrls={imageUrls} alt="Estado" className="me-2" style={{ width: '180px' }} maxDisplay={6} />
          </div>
        </Box>
      )}
    </>
  );
}
