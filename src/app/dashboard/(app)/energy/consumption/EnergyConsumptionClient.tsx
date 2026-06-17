'use client';

import { useTranslations } from 'next-intl';
import { Badge } from 'react-bootstrap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import GenericTable from '@/components/GenericTable';
import { axisProps, gridProps, tooltipStyle } from '@/components/charts/theme';
import type { EnergyConsumptionRecord } from '@/domain/energy/EnergyTypes';

const STAGE_COLORS: Record<string, string> = {
  MANUFACTURING: '#f59e0b',
  TRANSPORT: '#60a5fa',
  USE: '#22c55e',
  MAINTENANCE: '#94a3b8',
  END_OF_LIFE: '#ef4444',
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

const STAGE_LABEL: Record<string, string> = {
  MANUFACTURING: 'Fabricación', TRANSPORT: 'Transporte',
  USE: 'Uso', MAINTENANCE: 'Mantenimiento', END_OF_LIFE: 'Fin de vida',
};

export default function EnergyConsumptionClient({ records }: { records: EnergyConsumptionRecord[] }) {
  const t = useTranslations('energy');

  const totalKwh = records.reduce((s, r) => s + r.consumptionKwh, 0);
  const totalMj = records.reduce((s, r) => s + (r.consumptionMj ?? r.consumptionKwh * 3.6), 0);
  const avgKwh = records.length ? totalKwh / records.length : 0;

  // Monthly bar chart data — group by month
  const byMonth = records.reduce<Record<string, { month: string; kWh: number; MJ: number }>>((acc, r) => {
    const month = new Date(r.periodStart).toLocaleDateString('es', { month: 'short', year: '2-digit' });
    if (!acc[month]) acc[month] = { month, kWh: 0, MJ: 0 };
    acc[month].kWh += r.consumptionKwh;
    acc[month].MJ += r.consumptionMj ?? r.consumptionKwh * 3.6;
    return acc;
  }, {});
  const chartData = Object.values(byMonth).slice(-12);

  // Stage breakdown
  const byStage = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.lifecycleStage] = (acc[r.lifecycleStage] ?? 0) + r.consumptionKwh;
    return acc;
  }, {});
  const stageData = Object.entries(byStage).map(([stage, kWh]) => ({
    stage: STAGE_LABEL[stage] ?? stage, kWh: +kWh.toFixed(1), fill: STAGE_COLORS[stage] ?? '#94a3b8',
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={tooltipStyle} className="p-2 small">
        <div className="fw-semibold mb-1">{label}</div>
        {payload.map((e: any) => (
          <div key={e.name} style={{ color: e.color }}>
            {e.name}: {e.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
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
          <KpiCard icon="bi-lightning-charge" label="Total consumido" value={`${(totalKwh / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} MWh`} sub={`${totalKwh.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`} color="#0d6efd" />
        </div>
        <div className="col-6 col-md-3">
          <KpiCard icon="bi-thermometer" label="Equivalente en MJ" value={`${(totalMj / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} GJ`} color="#f59e0b" />
        </div>
        <div className="col-6 col-md-3">
          <KpiCard icon="bi-bar-chart" label="Media por registro" value={`${avgKwh.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`} color="#22c55e" />
        </div>
        <div className="col-6 col-md-3">
          <KpiCard icon="bi-file-earmark-bar-graph" label="Registros totales" value={`${records.length}`} color="#8b5cf6" />
        </div>
      </div>

      {/* Charts */}
      <div className="row g-3 mb-4">
        {/* Monthly bar */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent fw-semibold border-0 pb-0">
              <i className="bi bi-bar-chart me-2 text-primary" />Consumo mensual (kWh)
            </div>
            <div className="card-body pt-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" {...axisProps} tick={{ ...axisProps.tick, fontSize: 11 }} />
                  <YAxis {...axisProps} tick={{ ...axisProps.tick, fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="kWh" name="kWh" fill="#0d6efd" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* By lifecycle stage */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent fw-semibold border-0 pb-0">
              <i className="bi bi-layers me-2 text-warning" />Por etapa de ciclo de vida
            </div>
            <div className="card-body pt-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stageData} layout="vertical" margin={{ top: 4, right: 8, left: 60, bottom: 0 }}>
                  <CartesianGrid {...gridProps} horizontal={false} />
                  <XAxis type="number" {...axisProps} tick={{ ...axisProps.tick, fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="stage" {...axisProps} tick={{ ...axisProps.tick, fontSize: 11 }} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="kWh" name="kWh" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {stageData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <GenericTable
        title={t('consumption.title')}
        icon="bi-speedometer2"
        initialData={records}
        filterPlaceholder="Buscar registro..."
        customColumns={[
          {
            key: 'period',
            label: t('consumption.period'),
            render: (row) => (
              <div className="small">
                <div className="fw-medium">{new Date(row.periodStart).toLocaleDateString()}</div>
                <div className="text-muted">→ {new Date(row.periodEnd).toLocaleDateString()}</div>
              </div>
            ),
          },
          {
            key: 'consumptionKwh',
            label: t('consumption.kwh'),
            render: (row) => (
              <div>
                <div className="fw-semibold">{row.consumptionKwh.toLocaleString()} kWh</div>
                <div className="text-muted small">{(row.consumptionMj ?? row.consumptionKwh * 3.6).toLocaleString(undefined, { maximumFractionDigits: 1 })} MJ</div>
              </div>
            ),
          },
          {
            key: 'lifecycleStage',
            label: t('consumption.lifecycleStage'),
            render: (row) => (
              <Badge style={{ background: STAGE_COLORS[row.lifecycleStage] ?? '#94a3b8' }} className="fw-normal">
                {STAGE_LABEL[row.lifecycleStage] ?? row.lifecycleStage}
              </Badge>
            ),
          },
          {
            key: 'measurementStandard',
            label: 'Estándar',
            render: (row) => row.measurementStandard
              ? <span className="text-muted small font-monospace">{row.measurementStandard}</span>
              : <span className="text-muted">—</span>,
          },
          {
            key: 'cost',
            label: t('consumption.cost'),
            render: (row) => row.costAmount != null
              ? <span className="fw-medium">{row.costAmount.toFixed(2)} {row.currency ?? ''}</span>
              : <span className="text-muted">—</span>,
          },
        ]}
      />
    </div>
  );
}
