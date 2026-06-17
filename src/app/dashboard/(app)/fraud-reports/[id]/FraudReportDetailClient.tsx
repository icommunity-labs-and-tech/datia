'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { Badge, Button, Form } from 'react-bootstrap';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Box from '@/components/Box';
import LoadingOverlay from '@/components/Loading';
import { Divider } from '@/components/Divider';
import ImageModal from '@/components/ImageModal';
import { getFraudReport } from '@/actions/fraudReports/update-fraud-report';
import { updateFraudReportStatus } from '@/actions/fraudReports/update-fraud-report';
import type { FraudReportStatus, FraudReportWithItem } from '@/domain/fraudReports/FraudReport';

const LeafletMap = dynamic(
  () => import('@/app/customer/components/FraudReportMap'),
  { ssr: false, loading: () => <div style={{ height: 280, background: '#f1f5f9', borderRadius: 8 }} /> }
);

const STATUS_VARIANTS: Record<FraudReportStatus, string> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'info',
  CONFIRMED: 'danger',
  DISMISSED: 'secondary',
};

const ALL_STATUSES: FraudReportStatus[] = ['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'];

export default function FraudReportDetailClient() {
  const t = useTranslations('fraudReportAdmin');
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<FraudReportWithItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState<FraudReportStatus>('PENDING');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    getFraudReport(id).then((res) => {
      if (res.success && res.data) {
        setReport(res.data);
        setNewStatus(res.data.status);
      }
      setLoading(false);
    });
  }, [id]);

  const handleSaveStatus = async () => {
    if (!report || newStatus === report.status) return;
    setSaving(true);
    const result = await updateFraudReportStatus(report.id, newStatus);
    if (result.success) {
      setReport((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
    setSaving(false);
  };

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  if (loading) return <LoadingOverlay />;

  if (!report) {
    return (
      <Box>
        <p className="text-muted">{t('notFound')}</p>
        <Button variant="outline-secondary" size="sm" onClick={() => router.back()}>{t('back')}</Button>
      </Box>
    );
  }

  return (
    <>
      <Box>
        <div className="d-flex align-items-center gap-2 mb-2">
          <i className="bi bi-shield-exclamation" style={{ fontSize: '1.1rem' }} />
          <h4 className="mb-0">{t('detailTitle')}</h4>
          <Badge
            bg={STATUS_VARIANTS[report.status]}
            text={report.status === 'PENDING' ? 'dark' : undefined}
          >
            {t(`status.${report.status}`)}
          </Badge>
        </div>
        <Divider />

        <div className="row g-4">
          {/* Left column: fields */}
          <div className="col-md-6">
            <DetailRow label={t('fields.item')} value={report.item.name} />
            <DetailRowLink
              label={t('fields.itemId')}
              value={report.item.id}
              href={`/dashboard/items/${report.item.id}`}
            />
            <DetailRow label={t('fields.reportId')} value={report.id} mono />
            <DetailRow label={t('fields.date')} value={formatDate(report.createdAt)} />
            {report.acquiredAt && (
              <DetailRow label={t('fields.acquiredAt')} value={report.acquiredAt} />
            )}
            {report.locationName && (
              <DetailRow label={t('fields.locationName')} value={report.locationName} />
            )}
            {report.comments && (
              <div className="mb-3">
                <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('fields.comments')}
                </span>
                <p style={{ marginTop: 4, fontSize: '0.9rem', color: '#1e293b', background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  {report.comments}
                </p>
              </div>
            )}

            {/* Status field — inline with save */}
            <div className="mb-3">
              <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('changeStatus')}
              </span>
              <div className="d-flex align-items-center gap-2 mt-1">
                <Form.Select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as FraudReportStatus)}
                  size="sm"
                  style={{ maxWidth: 200 }}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`status.${s}`)}</option>
                  ))}
                </Form.Select>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveStatus}
                  disabled={saving || newStatus === report.status}
                >
                  {saving ? t('saving') : t('saveStatus')}
                </Button>
              </div>
            </div>
          </div>

          {/* Right column: map */}
          {report.latitude != null && report.longitude != null && (
            <div className="col-md-6">
              <span className="text-muted d-block mb-1" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <i className="bi bi-geo-alt me-1" />{t('reportedLocation')}
              </span>
              <div style={{ height: 300, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <LeafletMap
                  coords={{ lat: report.latitude, lng: report.longitude }}
                  onMarkerMove={() => {}}
                  readonly
                />
              </div>
            </div>
          )}
        </div>
      </Box>

      {/* Photo evidence */}
      {report.imageUrls && report.imageUrls.length > 0 && (
        <Box>
          <div className="d-flex align-items-center gap-2 mb-2">
            <i className="bi bi-camera" />
            <h5 className="mb-0">{t('photoEvidence')}</h5>
            <span className="text-muted small">({report.imageUrls.length})</span>
          </div>
          <Divider />
          <div className="d-flex flex-wrap gap-3">
            {report.imageUrls.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                style={{
                  padding: 0, background: 'none', border: '1px solid #e2e8f0',
                  borderRadius: 8, overflow: 'hidden', cursor: 'zoom-in', flexShrink: 0,
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`${t('photoAlt')} ${i + 1}`}
                  style={{ width: 140, height: 140, objectFit: 'cover', display: 'block' }}
                />
              </button>
            ))}
          </div>
        </Box>
      )}

      {/* Lightbox */}
      <ImageModal
        show={lightboxIndex != null}
        onHide={() => setLightboxIndex(null)}
        imageUrls={report.imageUrls}
        activeIndex={lightboxIndex ?? 0}
        onNavigate={setLightboxIndex}
        alt={t('photoAlt')}
        title={t('photoEvidence')}
      />
    </>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="mb-3">
      <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <p style={{ marginTop: 2, marginBottom: 0, fontSize: '0.9rem', color: '#1e293b', fontFamily: mono ? 'monospace' : undefined }}>
        {value}
      </p>
    </div>
  );
}

function DetailRowLink({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div className="mb-3">
      <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <p style={{ marginTop: 2, marginBottom: 0, fontSize: '0.9rem' }}>
        <Link href={href} style={{ fontFamily: 'monospace', color: '#0d6efd', textDecoration: 'none' }}>
          {value} <i className="bi bi-box-arrow-up-right" style={{ fontSize: '0.75rem' }} />
        </Link>
      </p>
    </div>
  );
}
