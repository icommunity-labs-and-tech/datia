'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Badge } from 'react-bootstrap';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend,
} from 'recharts';
import GenericTable from '@/components/GenericTable';
import { axisProps, gridProps, tooltipStyle } from '@/components/charts/theme';
import type { EmissionRecord } from '@/domain/energy/EnergyTypes';

const STATUS_VARIANT: Record<string, string> = {
  PENDING: 'warning', VERIFIED: 'success', REJECTED: 'danger',
};

const SCOPE_COLOR: Record<string, string> = {
  SCOPE_1: '#0d6efd', SCOPE_2: '#0ea5e9', SCOPE_3: '#8b5cf6',
};

const SCOPE_LABEL: Record<string, string> = {
  SCOPE_1: 'Scope 1', SCOPE_2: 'Scope 2', SCOPE_3: 'Scope 3',
};

function KpiCard({ label, value, sub, icon, color = '#0d6efd' }: {
  label: string; value: string; sub?: string; icon: string; color?: string;
}) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body d-flex align-items-center gap-3">
        <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 48, height: 48, background: `${color}18` }}>
          <i className={`bi ${icon} fs-5`} style={{ color }} />
        </div>
        <div>
          <div className="fw-bold fs-5 lh-1">{value}</div>
          <div className="text-muted small">{label}</div>
          {sub && <div className="text-muted" style={{ fontSize: '0.7rem' }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export default function EmissionsClient({ records }: { records: EmissionRecord[] }) {
  const t = useTranslations('energy');
  const router = useRouter();

  const verified = records.filter(r => r.verificationStatus === 'VERIFIED');
  const pending = records.filter(r => r.verificationStatus === 'PENDING');
  const totalCo2 = records.reduce((s, r) => s + r.co2eKg, 0);
  const verifiedCo2 = verified.reduce((s, r) => s + r.co2eKg, 0);

  // Trend area chart — by creation date
  const sorted = [...records].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const trendData = sorted.map(r => ({
    date: new Date(r.createdAt).toLocaleDateString('es', { month: 'short', year: '2-digit' }),
    'CO₂e kg': +r.co2eKg.toFixed(2),
    scope: r.scope,
  }));

  // By scope pie
  const byScope = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.scope] = (acc[r.scope] ?? 0) + r.co2eKg;
    return acc;
  }, {});
  const scopeData = Object.entries(byScope).map(([scope, value]) => ({
    name: SCOPE_LABEL[scope] ?? scope,
    value: +value.toFixed(2),
    fill: SCOPE_COLOR[scope] ?? '#94a3b8',
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={tooltipStyle} className="p-2 small">
        {label && <div className="fw-semibold mb-1">{label}</div>}
        {payload.map((e: any) => (
          <div key={e.name} style={{ color: e.color ?? e.fill }}>
            {e.name}: {(+e.value).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <KpiCard icon="bi-cloud" label="Total CO₂e" value={`${totalCo2.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`} sub={`${(totalCo2 / 1000).toFixed(2)} t`} color="#22c55e" />
        </div>
        <div className="col-6 col-md-3">
          <KpiCard icon="bi-patch-check" label="Certificadas" value={`${verified.length}`} sub={`${verifiedCo2.toFixed(1)} kg CO₂e`} color="#0d6efd" />
        </div>
        <div className="col-6 col-md-3">
          <KpiCard icon="bi-hourglass-split" label="Pendientes" value={`${pending.length}`} color="#f59e0b" />
        </div>
        <div className="col-6 col-md-3">
          <KpiCard icon="bi-shield-check" label="Tasa verificación" value={`${records.length ? ((verified.length / records.length) * 100).toFixed(0) : 0}%`} color="#8b5cf6" />
        </div>
      </div>

      {/* Charts */}
      <div className="row g-3 mb-4">
        {/* Area trend */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent fw-semibold border-0 pb-0">
              <i className="bi bi-graph-up me-2 text-success" />Evolución de emisiones CO₂e
            </div>
            <div className="card-body pt-2">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="date" {...axisProps} tick={{ ...axisProps.tick, fontSize: 11 }} />
                  <YAxis {...axisProps} tick={{ ...axisProps.tick, fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone" dataKey="CO₂e kg"
                    stroke="#22c55e" strokeWidth={2}
                    fill="url(#co2Gradient)"
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* By scope pie */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent fw-semibold border-0 pb-0">
              <i className="bi bi-pie-chart me-2 text-primary" />Distribución por Scope (GHG)
            </div>
            <div className="card-body pt-2 d-flex align-items-center justify-content-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={scopeData} dataKey="value" nameKey="name"
                    cx="50%" cy="45%" outerRadius={80} innerRadius={45}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {scopeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <GenericTable
        title={t('emissions.title')}
        icon="bi-cloud"
        initialData={records}
        filterPlaceholder="Buscar emisión..."
        onRowDoubleClick={(row) => router.push(`/dashboard/energy/emissions/${row.id}`)}
        customColumns={[
          {
            key: 'co2eKg',
            label: 'CO₂e (kg)',
            render: (row) => (
              <span className="fw-semibold">{row.co2eKg.toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
            ),
          },
          {
            key: 'scope',
            label: 'Scope GHG',
            render: (row) => (
              <Badge style={{ background: SCOPE_COLOR[row.scope] ?? '#94a3b8' }} className="fw-normal">
                {SCOPE_LABEL[row.scope] ?? row.scope}
              </Badge>
            ),
          },
          {
            key: 'systemBoundary',
            label: t('emissions.systemBoundary'),
            render: (row) => (
              <span className="text-muted small">{row.systemBoundary.replace(/_/g, '-').toLowerCase()}</span>
            ),
          },
          {
            key: 'calculationMethodology',
            label: 'Metodología',
            render: (row) => row.calculationMethodology
              ? <span className="small font-monospace">{row.calculationMethodology}</span>
              : <span className="text-muted">—</span>,
          },
          {
            key: 'verifierBody',
            label: 'Verificador',
            render: (row) => row.verifierBody
              ? <span className="small">{row.verifierBody}</span>
              : <span className="text-muted">—</span>,
          },
          {
            key: 'verificationStatus',
            label: t('emissions.status'),
            render: (row) => (
              <Badge bg={STATUS_VARIANT[row.verificationStatus] ?? 'secondary'} className="fw-normal">
                {row.verificationStatus}
              </Badge>
            ),
          },
        ]}
        rowActions={[
          {
            label: 'Ver detalle',
            icon: 'bi-arrow-right',
            onClick: (row) => router.push(`/dashboard/energy/emissions/${row.id}`),
          },
        ]}
      />
    </div>
  );
}
