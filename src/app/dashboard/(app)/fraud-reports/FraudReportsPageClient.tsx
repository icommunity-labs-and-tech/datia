'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Badge, Button, Col, Form, Pagination, Row, Table } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import Box from '@/components/Box';
import LoadingOverlay from '@/components/Loading';
import { Divider } from '@/components/Divider';
import { listFraudReports } from '@/actions/fraudReports/list-fraud-reports';
import type { FraudReportStatus, FraudReportWithItem } from '@/domain/fraudReports/FraudReport';
import { axisProps, gridProps, tooltipStyle } from '@/components/charts/theme';

const FraudReportsMap = dynamic(() => import('./FraudReportsMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 420, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
      Cargando mapa...
    </div>
  ),
});

const STATUS_VARIANTS: Record<FraudReportStatus, string> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'info',
  CONFIRMED: 'danger',
  DISMISSED: 'secondary',
};

const STATUS_COLORS: Record<FraudReportStatus, string> = {
  PENDING: '#f59e0b',
  UNDER_REVIEW: '#0dcaf0',
  CONFIRMED: '#ef4444',
  DISMISSED: '#94a3b8',
};

const PAGE_SIZES = [10, 25, 50];

export default function FraudReportsPageClient() {
  const t = useTranslations('fraudReportAdmin');
  const router = useRouter();
  const [allReports, setAllReports] = useState<FraudReportWithItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FraudReportStatus | 'ALL'>('ALL');
  const [monthFilter, setMonthFilter] = useState<number | null>(null); // YYYYMM
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listFraudReports();
    if (result.success && result.data) {
      setAllReports(result.data);
      setPendingCount(result.pendingCount ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [statusFilter, monthFilter, dateFrom, dateTo, pageSize]);

  const reports = useMemo(() => {
    let filtered = statusFilter === 'ALL' ? allReports : allReports.filter((r) => r.status === statusFilter);
    if (monthFilter !== null) {
      filtered = filtered.filter((r) => {
        const d = new Date(r.createdAt);
        return d.getFullYear() * 100 + d.getMonth() === monthFilter;
      });
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((r) => new Date(r.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => new Date(r.createdAt) <= to);
    }
    return filtered;
  }, [allReports, statusFilter, monthFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(reports.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedReports = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return reports.slice(start, start + pageSize);
  }, [reports, safePage, pageSize]);

  const hasActiveFilters = dateFrom || dateTo;

  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  // --- Chart data ---
  const statusCounts = useMemo(() => {
    const c: Record<FraudReportStatus, number> = { PENDING: 0, UNDER_REVIEW: 0, CONFIRMED: 0, DISMISSED: 0 };
    allReports.forEach((r) => { c[r.status]++; });
    return c;
  }, [allReports]);

  const statusPieData = useMemo(
    () => (Object.entries(statusCounts) as [FraudReportStatus, number][])
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({ status, value, name: t(`status.${status}`) })),
    [statusCounts, t],
  );

  const monthlyData = useMemo(() => {
    const map = new Map<number, { key: number; label: string; count: number }>();
    allReports.forEach((r) => {
      const d = new Date(r.createdAt);
      const key = d.getFullYear() * 100 + d.getMonth();
      const label = d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
      const existing = map.get(key);
      if (existing) existing.count++;
      else map.set(key, { key, label, count: 1 });
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([, v]) => v);
  }, [allReports]);

  const activeMonthLabel = useMemo(() => {
    if (monthFilter === null) return null;
    return monthlyData.find((m) => m.key === monthFilter)?.label ?? null;
  }, [monthFilter, monthlyData]);

  const lastClickRef = useRef<{ time: number; rowId: string } | null>(null);

  const handleRowClick = (id: string) => {
    const now = Date.now();
    const last = lastClickRef.current;
    if (last && last.rowId === id && now - last.time < 300) {
      lastClickRef.current = null;
      router.push(`/dashboard/fraud-reports/${id}`);
      return;
    }
    lastClickRef.current = { time: now, rowId: id };
  };

  const reportsWithCoords = reports.filter((r) => r.latitude != null && r.longitude != null);

  // Pagination visible pages helper
  const visiblePages = useMemo(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  if (loading) return <LoadingOverlay />;

  return (
    <>
      <Box>
        <h6 className="mb-2">{t('whatIsFraudReports')}</h6>
        <Divider />
        <p className="mb-0 text-muted">{t('fraudReportsDescription')}</p>
      </Box>

      {/* Charts — only when there are reports */}
      {allReports.length > 0 && (
        <Box>
          <div className="d-flex align-items-center gap-2 mb-2">
            <i className="bi bi-bar-chart" style={{ fontSize: '1.1rem' }} />
            <h5 className="mb-0">{t('charts.statsTitle')}</h5>
          </div>
          <Divider />

          {/* KPI stat cards */}
          <div className="d-flex gap-3 flex-wrap mb-4">
            <div
              style={statCardStyle('#0d6efd', statusFilter === 'ALL')}
              onClick={() => setStatusFilter('ALL')}
              title={t('status.ALL')}
            >
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0d6efd', lineHeight: 1 }}>{allReports.length}</div>
              <div style={statLabelStyle}>{t('charts.total')}</div>
            </div>
            {(Object.entries(statusCounts) as [FraudReportStatus, number][]).map(([status, count]) => (
              <div
                key={status}
                style={statCardStyle(STATUS_COLORS[status], statusFilter === status)}
                onClick={() => setStatusFilter((prev) => prev === status ? 'ALL' : status)}
                title={t(`status.${status}`)}
              >
                <div style={{ fontSize: '2rem', fontWeight: 700, color: STATUS_COLORS[status], lineHeight: 1 }}>{count}</div>
                <div style={statLabelStyle}>{t(`status.${status}`)}</div>
              </div>
            ))}
          </div>

          {/* Donut + Bar charts */}
          <Row>
            <Col md={4}>
              <div className="d-flex align-items-center justify-content-between" style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('charts.statusTitle')}
                </div>
                {statusFilter !== 'ALL' && (
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.75rem', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    <i className="bi bi-x-circle" /> {t('status.ALL')}
                  </button>
                )}
              </div>
              <ResponsiveContainer width="100%" height={330}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="43%"
                    innerRadius="33%"
                    outerRadius="54%"
                    dataKey="value"
                    paddingAngle={3}
                    style={{ cursor: 'pointer' }}
                    onClick={(entry) => {
                      const clicked = entry?.status as FraudReportStatus;
                      setStatusFilter((prev) => prev === clicked ? 'ALL' : clicked);
                    }}
                  >
                    {statusPieData.map(({ status }) => (
                      <Cell
                        key={status}
                        fill={STATUS_COLORS[status]}
                        opacity={statusFilter === 'ALL' || statusFilter === status ? 1 : 0.25}
                        stroke={statusFilter === status ? STATUS_COLORS[status] : 'none'}
                        strokeWidth={statusFilter === status ? 3 : 0}
                      />
                    ))}
                  </Pie>
                  <RechartTooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={tooltipStyle}
                  />
                  <Legend
                    onClick={(entry) => {
                      const clicked = (entry as any).payload?.status as FraudReportStatus;
                      if (clicked) setStatusFilter((prev) => prev === clicked ? 'ALL' : clicked);
                    }}
                    formatter={(value, entry) => {
                      const status = (entry as any).payload?.status as FraudReportStatus;
                      const isActive = statusFilter === 'ALL' || statusFilter === status;
                      return (
                        <span style={{ fontSize: '0.78rem', color: isActive ? '#1e293b' : '#94a3b8', cursor: 'pointer', fontWeight: statusFilter === status ? 600 : 400 }}>
                          {value}
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Col>
            <Col md={8}>
              <div className="d-flex align-items-center justify-content-between" style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('charts.monthlyTitle')}
                </div>
                {monthFilter !== null && (
                  <button
                    onClick={() => setMonthFilter(null)}
                    style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.75rem', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    <i className="bi bi-x-circle" /> {activeMonthLabel}
                  </button>
                )}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={monthlyData}
                  margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                >
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} tick={{ ...axisProps.tick, fontSize: 11 }} />
                  <YAxis {...axisProps} allowDecimals={false} width={28} />
                  <RechartTooltip
                    formatter={(value: number) => [value, t('charts.reports')]}
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    name={t('charts.reports')}
                    style={{ cursor: 'pointer' }}
                    onClick={(data: any) => {
                      const key = data?.key as number | undefined;
                      if (key != null) setMonthFilter((prev) => prev === key ? null : key);
                    }}
                  >
                    {monthlyData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill="#3b82f6"
                        opacity={monthFilter === null || monthFilter === entry.key ? 1 : 0.25}
                        stroke={monthFilter === entry.key ? '#1d4ed8' : 'none'}
                        strokeWidth={monthFilter === entry.key ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Col>
          </Row>
        </Box>
      )}

      <Box>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-shield-exclamation" style={{ fontSize: '1.25rem' }} />
            <h4 className="mb-0">{t('title')}</h4>
            {pendingCount > 0 && (
              <Badge bg="warning" text="dark">{pendingCount} {t('pending')}</Badge>
            )}
            {statusFilter !== 'ALL' && (
              <Badge
                bg={STATUS_VARIANTS[statusFilter]}
                text={statusFilter === 'PENDING' ? 'dark' : undefined}
                style={{ cursor: 'pointer' }}
                onClick={() => setStatusFilter('ALL')}
                title={t('status.ALL')}
              >
                {t(`status.${statusFilter}`)} ×
              </Badge>
            )}
            {activeMonthLabel && (
              <Badge
                bg="primary"
                style={{ cursor: 'pointer' }}
                onClick={() => setMonthFilter(null)}
                title="Quitar filtro de mes"
              >
                <i className="bi bi-calendar3 me-1" />{activeMonthLabel} ×
              </Badge>
            )}
          </div>
        </div>
        <Divider />

        {/* Date filters */}
        <div className="mb-3 d-flex align-items-center gap-2 flex-wrap">
          <span className="text-muted" style={{ fontSize: '0.875rem' }}>{t('filterByDate')}:</span>
          <div className="d-flex align-items-center gap-1">
            <label style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>{t('dateFrom')}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={dateInputStyle}
            />
          </div>
          <div className="d-flex align-items-center gap-1">
            <label style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>{t('dateTo')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={dateInputStyle}
            />
          </div>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
            >
              <i className="bi bi-x-circle me-1" />{t('clearDates')}
            </Button>
          )}
        </div>

        {reports.length === 0 ? (
          <p className="text-muted text-center py-4">{t('noReports')}</p>
        ) : (
          <>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>{t('columns.item')}</th>
                  <th>{t('columns.location')}</th>
                  <th>{t('columns.date')}</th>
                  <th>{t('columns.status')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => handleRowClick(r.id)}
                    style={{ cursor: 'pointer' }}
                    title="Doble clic para ver detalles"
                  >
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.item.id}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        {r.acquiredAt || (
                          r.latitude ? `${r.latitude.toFixed(4)}, ${r.longitude?.toFixed(4)}` : '—'
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                      {formatDate(r.createdAt)}
                    </td>
                    <td>
                      <Badge bg={STATUS_VARIANTS[r.status]} text={r.status === 'PENDING' ? 'dark' : undefined}>
                        {t(`status.${r.status}`)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Pagination */}
            <div className="pagination-container d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mt-3">
              <div className="pagination-info text-muted small">
                {t('pagination.showing', {
                  from: (safePage - 1) * pageSize + 1,
                  to: Math.min(safePage * pageSize, reports.length),
                  total: reports.length,
                })}
              </div>
              <div className="pagination-controls d-flex align-items-center gap-2">
                <div className="page-size-selector d-flex align-items-center gap-1">
                  <span className="text-muted small">{t('pagination.perPage')}</span>
                  <Form.Select
                    size="sm"
                    style={{ width: 'auto' }}
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </Form.Select>
                </div>
                {totalPages > 1 && (
                  <Pagination className="mb-0">
                    <Pagination.First onClick={() => setCurrentPage(1)} disabled={safePage === 1} />
                    <Pagination.Prev onClick={() => setCurrentPage((p) => p - 1)} disabled={safePage === 1} />
                    {visiblePages.map((p, i) =>
                      p === '...' ? (
                        <Pagination.Ellipsis key={`ellipsis-${i}`} disabled />
                      ) : (
                        <Pagination.Item
                          key={p}
                          active={safePage === p}
                          onClick={() => setCurrentPage(p as number)}
                        >
                          {p}
                        </Pagination.Item>
                      ),
                    )}
                    <Pagination.Next onClick={() => setCurrentPage((p) => p + 1)} disabled={safePage === totalPages} />
                    <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} />
                  </Pagination>
                )}
              </div>
            </div>
          </>
        )}
      </Box>

      {/* Mapa global — solo si hay denuncias con coordenadas */}
      {reportsWithCoords.length > 0 && (
        <Box>
          <div className="d-flex align-items-center gap-2 mb-2">
            <i className="bi bi-geo-alt" />
            <h5 className="mb-0">{t('mapTitle')}</h5>
            <span className="text-muted" style={{ fontSize: '0.875rem' }}>
              ({reportsWithCoords.length} {t('reportsWithLocation')})
            </span>
          </div>
          <Divider />

          {/* Leyenda de colores */}
          <div className="d-flex gap-3 mb-3 flex-wrap">
            {(['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'] as FraudReportStatus[]).map((s) => {
              const count = reportsWithCoords.filter((r) => r.status === s).length;
              if (count === 0) return null;
              return (
                <div key={s} className="d-flex align-items-center gap-1" style={{ fontSize: '0.8rem' }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: STATUS_COLORS[s],
                    display: 'inline-block',
                  }} />
                  <span className="text-muted">{t(`status.${s}`)}: {count}</span>
                </div>
              );
            })}
          </div>

          <div style={{ height: 420, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <FraudReportsMap
              reports={reportsWithCoords}
              onSelectReport={(id) => router.push(`/dashboard/fraud-reports/${id}`)}
            />
          </div>
        </Box>
      )}
    </>
  );
}

const statCardStyle = (color: string, active = false): React.CSSProperties => ({
  flex: '1 1 110px',
  padding: '14px 18px',
  borderRadius: 10,
  border: `2px solid ${active ? color : `${color}22`}`,
  background: active ? `${color}18` : `${color}08`,
  cursor: 'pointer',
  transition: 'border-color 0.15s, background 0.15s',
  boxShadow: active ? `0 0 0 3px ${color}22` : 'none',
});

const statLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
  marginTop: 4,
  fontWeight: 500,
};

const dateInputStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  padding: '3px 8px',
  border: '1px solid #dee2e6',
  borderRadius: 4,
  color: '#495057',
  outline: 'none',
};
