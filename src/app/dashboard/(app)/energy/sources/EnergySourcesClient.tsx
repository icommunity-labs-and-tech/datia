'use client';

import { useTranslations } from 'next-intl';
import { Badge } from 'react-bootstrap';
import {
  RadialBarChart, RadialBar, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import GenericTable from '@/components/GenericTable';
import { tooltipStyle } from '@/components/charts/theme';
import type { EnergySourceRecord } from '@/domain/energy/EnergyTypes';

const CARRIER_ICONS: Record<string, string> = {
  ELECTRICITY: 'bi-plug', NATURAL_GAS: 'bi-fire', HYDROGEN: 'bi-droplet-half',
  SOLAR_THERMAL: 'bi-sun', DISTRICT_HEATING: 'bi-thermometer-high',
  DISTRICT_COOLING: 'bi-thermometer-low', BIOMASS: 'bi-tree',
  OIL: 'bi-fuel-pump', COAL: 'bi-stack', OTHER: 'bi-lightning',
};

const CARRIER_COLORS: Record<string, string> = {
  ELECTRICITY: '#0d6efd', NATURAL_GAS: '#f59e0b', HYDROGEN: '#0ea5e9',
  SOLAR_THERMAL: '#f97316', DISTRICT_HEATING: '#ef4444', DISTRICT_COOLING: '#22d3ee',
  BIOMASS: '#22c55e', OIL: '#78716c', COAL: '#44403c', OTHER: '#94a3b8',
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

export default function EnergySourcesClient({ sources }: { sources: EnergySourceRecord[] }) {
  const t = useTranslations('energy');

  const totalCapacity = sources.reduce((s, r) => s + (r.capacityKw ?? 0), 0);
  const avgRenewable = sources.filter(r => r.renewableShare != null).length
    ? sources.filter(r => r.renewableShare != null).reduce((s, r) => s + r.renewableShare!, 0) /
      sources.filter(r => r.renewableShare != null).length
    : null;

  // Capacity by carrier for radial chart
  const byCarrier = sources.reduce<Record<string, number>>((acc, r) => {
    if (r.capacityKw) acc[r.energyCarrier] = (acc[r.energyCarrier] ?? 0) + r.capacityKw;
    return acc;
  }, {});
  const radialData = Object.entries(byCarrier).map(([carrier, kw], i) => ({
    name: carrier.replace(/_/g, ' '),
    value: +kw.toFixed(1),
    fill: CARRIER_COLORS[carrier] ?? '#94a3b8',
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={tooltipStyle} className="p-2 small">
        <div className="fw-semibold">{payload[0].name}</div>
        <div>{payload[0].value.toLocaleString()} kW</div>
      </div>
    );
  };

  return (
    <div>
      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <KpiCard icon="bi-lightning-charge" label="Capacidad total" value={`${totalCapacity.toLocaleString()} kW`} sub={`${(totalCapacity / 1000).toFixed(2)} MW`} color="#0d6efd" />
        </div>
        <div className="col-6 col-md-3">
          <KpiCard icon="bi-sun" label="% Renovable medio" value={avgRenewable != null ? `${avgRenewable.toFixed(0)}%` : '—'} color="#22c55e" />
        </div>
        <div className="col-6 col-md-3">
          <KpiCard icon="bi-plug" label="Fuentes registradas" value={`${sources.length}`} color="#8b5cf6" />
        </div>
        <div className="col-6 col-md-3">
          <KpiCard icon="bi-award" label="Con certificado GO" value={`${sources.filter(s => s.guaranteeOfOriginId).length}`} sub="Guarantee of Origin" color="#f59e0b" />
        </div>
      </div>

      {/* Charts */}
      {radialData.length > 0 && (
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent fw-semibold border-0 pb-0">
                <i className="bi bi-pie-chart me-2 text-primary" />Capacidad por tipo de fuente (kW)
              </div>
              <div className="card-body pt-2">
                <ResponsiveContainer width="100%" height={220}>
                  <RadialBarChart
                    innerRadius="25%" outerRadius="90%"
                    data={radialData} startAngle={180} endAngle={-180}
                  >
                    <RadialBar dataKey="value" label={{ position: 'insideStart', fill: '#fff', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Renewable share cards */}
          <div className="col-12 col-md-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent fw-semibold border-0 pb-0">
                <i className="bi bi-leaf me-2 text-success" />Fracción renovable por fuente
              </div>
              <div className="card-body">
                <div className="d-flex flex-column gap-2 pt-1">
                  {sources.map(s => (
                    <div key={s.id} className="d-flex align-items-center gap-2">
                      <i className={`bi ${CARRIER_ICONS[s.energyCarrier] ?? 'bi-lightning'} text-muted`} style={{ width: 16 }} />
                      <div className="small text-truncate flex-shrink-0" style={{ width: 160 }}>{s.name}</div>
                      <div className="progress flex-grow-1" style={{ height: 8 }}>
                        <div
                          className="progress-bar"
                          style={{
                            width: `${s.renewableShare ?? 0}%`,
                            background: (s.renewableShare ?? 0) >= 80 ? '#22c55e' : (s.renewableShare ?? 0) >= 40 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <div className="small fw-semibold" style={{ width: 36, textAlign: 'right' }}>
                        {s.renewableShare != null ? `${s.renewableShare}%` : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <GenericTable
        title={t('sources.title')}
        icon="bi-lightning-charge"
        initialData={sources}
        filterPlaceholder="Buscar fuente..."
        customColumns={[
          {
            key: 'name',
            label: 'Fuente',
            render: (row) => (
              <div className="d-flex align-items-center gap-2">
                <i className={`bi ${CARRIER_ICONS[row.energyCarrier] ?? 'bi-lightning'} text-warning`} />
                <div>
                  <div className="fw-medium">{row.name}</div>
                  {row.generationTechnology && (
                    <div className="text-muted small">{row.generationTechnology.replace(/_/g, ' ')}</div>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'energyCarrier',
            label: 'Carrier (ESPR)',
            render: (row) => (
              <Badge style={{ background: CARRIER_COLORS[row.energyCarrier] ?? '#94a3b8' }} className="fw-normal">
                {row.energyCarrier.replace(/_/g, ' ')}
              </Badge>
            ),
          },
          {
            key: 'capacityKw',
            label: 'Capacidad',
            render: (row) => row.capacityKw != null
              ? <span className="fw-semibold">{row.capacityKw.toLocaleString()} kW</span>
              : <span className="text-muted">—</span>,
          },
          {
            key: 'renewableShare',
            label: '% Renovable',
            render: (row) => row.renewableShare != null ? (
              <div className="d-flex align-items-center gap-2">
                <div className="progress flex-grow-1" style={{ height: 6, minWidth: 60 }}>
                  <div className="progress-bar bg-success" style={{ width: `${row.renewableShare}%` }} />
                </div>
                <span className="small fw-semibold">{row.renewableShare}%</span>
              </div>
            ) : <span className="text-muted">—</span>,
          },
          {
            key: 'gridEmissionFactor',
            label: 'Factor emisión',
            render: (row) => row.gridEmissionFactor != null
              ? <span className="text-muted small">{row.gridEmissionFactor} gCO₂/kWh</span>
              : <span className="text-muted">—</span>,
          },
          {
            key: 'countryOfOrigin',
            label: 'País',
            render: (row) => row.countryOfOrigin
              ? <Badge bg="light" text="dark" className="border">{row.countryOfOrigin}</Badge>
              : <span className="text-muted">—</span>,
          },
        ]}
      />
    </div>
  );
}
