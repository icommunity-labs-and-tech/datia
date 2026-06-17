'use client';

import Link from 'next/link';
import { Badge } from 'react-bootstrap';
import { useTranslations } from 'next-intl';
import type { FraudReportStatus, FraudReportWithItem } from '@/domain/fraudReports/FraudReport';

const STATUS_VARIANTS: Record<FraudReportStatus, string> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'info',
  CONFIRMED: 'danger',
  DISMISSED: 'secondary',
};

interface FraudReportsSummaryWidgetProps {
  reports: FraudReportWithItem[];
  pendingCount: number;
}

export function FraudReportsSummaryWidget({ reports, pendingCount }: FraudReportsSummaryWidgetProps) {
  const t = useTranslations('fraudReportAdmin');

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const recent = reports.slice(0, 4);

  return (
    <div>
      {/* Header row */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          {pendingCount > 0 ? (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(245,158,11,0.12)', color: '#d97706', flexShrink: 0,
              }}
            >
              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '1rem' }} />
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(16,185,129,0.12)', color: '#059669', flexShrink: 0,
              }}
            >
              <i className="bi bi-shield-check-fill" style={{ fontSize: '1rem' }} />
            </span>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.5rem', lineHeight: 1, color: pendingCount > 0 ? '#d97706' : '#059669' }}>
              {pendingCount}
            </div>
            <div className="text-muted" style={{ fontSize: '0.78rem' }}>{t('widget.pendingLabel')}</div>
          </div>
        </div>
        <Link
          href="/dashboard/fraud-reports"
          style={{ fontSize: '0.8rem', color: '#3b82f6', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {t('widget.viewAll')} →
        </Link>
      </div>

      {/* Recent reports */}
      {recent.length === 0 ? (
        <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>{t('noReports')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {recent.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/fraud-reports/${r.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 8,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  transition: 'background 0.15s',
                  gap: 8,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f1f5f9'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.item.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 1 }}>
                    {r.acquiredAt || (r.latitude ? `${r.latitude.toFixed(2)}, ${r.longitude?.toFixed(2)}` : t('widget.noLocation'))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                  <Badge
                    bg={STATUS_VARIANTS[r.status]}
                    text={r.status === 'PENDING' ? 'dark' : undefined}
                    style={{ fontSize: '0.68rem' }}
                  >
                    {t(`status.${r.status}`)}
                  </Badge>
                  <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>{formatDate(r.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {reports.length > 4 && (
        <div className="text-center mt-2">
          <Link href="/dashboard/fraud-reports" style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {t('widget.andMore', { count: reports.length - 4 })}
          </Link>
        </div>
      )}
    </div>
  );
}
