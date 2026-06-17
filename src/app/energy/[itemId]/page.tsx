'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

// ── types ────────────────────────────────────────────────────────────────────

interface Emission {
  id: string; co2eKg: number; scope: string; systemBoundary: string;
  emissionFactor: number | null; emissionFactorSource: string | null;
  calculationMethodology: string | null; gwpCharacterizationFactors: string | null;
  verifierBody: string | null; verificationStandard: string | null;
  verificationStatus: string; createdAt: string;
}
interface Consumption {
  id: string; periodStart: string; periodEnd: string; consumptionKwh: number;
  consumptionMj: number | null; lifecycleStage: string;
  measurementStandard: string | null; costAmount: number | null;
  currency: string | null; emissions: Emission[];
}
interface EnergySource {
  id: string; name: string; energyCarrier: string; generationTechnology: string | null;
  capacityKw: number | null; location: string | null; renewableShare: number | null;
  guaranteeOfOriginId: string | null; countryOfOrigin: string | null;
  gridEmissionFactor: number | null; installationDate: string | null;
  consumptions: Consumption[];
}
interface PassportData {
  item: { id: string; name: string; description: string | null; imageUrl: string | null; templateFields: any; createdAt: string; organization: { nombre: string; logoUrl: string | null; brandColorPrimary: string | null } };
  sources: EnergySource[];
  kpis: { totalKwh: number; totalCo2eKg: number; certifiedEmissions: number; avgRenewableShare: number | null; sourcesCount: number };
}

// ── constants ────────────────────────────────────────────────────────────────

const SCOPE_COLOR: Record<string, string> = { SCOPE_1: '#0d6efd', SCOPE_2: '#0ea5e9', SCOPE_3: '#8b5cf6' };
const STAGE_COLOR: Record<string, string> = { MANUFACTURING: '#f59e0b', TRANSPORT: '#60a5fa', USE: '#22c55e', MAINTENANCE: '#94a3b8', END_OF_LIFE: '#ef4444' };
const CARRIER_ICON: Record<string, string> = { ELECTRICITY: 'bi-plug', NATURAL_GAS: 'bi-fire', HYDROGEN: 'bi-droplet-half', SOLAR_THERMAL: 'bi-sun', BIOMASS: 'bi-tree', OIL: 'bi-fuel-pump', COAL: 'bi-stack', OTHER: 'bi-lightning' };
const GREEN = '#059669';
const TEAL = '#0d9488';
const tooltipStyle = { background: 'rgba(255,255,255,0.97)', border: '1px solid #d1fae5', borderRadius: 8, fontSize: 13 };

// ── sub-components ────────────────────────────────────────────────────────────

function KpiTile({ icon, value, label, sub, color = GREEN }: { icon: string; value: string; label: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: '1px solid #d1fae5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`bi ${icon}`} style={{ color, fontSize: '1.2rem' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.3rem', lineHeight: 1, color: '#111827' }}>{value}</div>
          <div style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: 2 }}>{label}</div>
          {sub && <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function ScopeBar({ label, kg, total, color }: { label: string; kg: number; total: number; color: string }) {
  const pct = total > 0 ? (kg / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: '#374151' }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span>{kg.toFixed(2)} kg</span>
      </div>
      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function EnergyPassportPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const router = useRouter();
  const [data, setData] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/energy/item/${itemId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(() => setError('Activo no encontrado o sin datos de certificación'))
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="text-center">
        <div className="spinner-border" style={{ color: GREEN }} />
        <p className="mt-3 text-muted small">Cargando certificación...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="text-center">
        <i className="bi bi-exclamation-circle" style={{ fontSize: '3rem', color: '#ef4444' }} />
        <p className="mt-3 text-muted">{error ?? 'Error inesperado'}</p>
        <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => router.push('/energy')}>← Volver</button>
      </div>
    </div>
  );

  const { item, sources, kpis } = data;
  const allConsumptions = sources.flatMap(s => s.consumptions);
  const allEmissions = allConsumptions.flatMap(c => c.emissions);

  // Chart: monthly consumption trend
  const monthlyMap: Record<string, { month: string; kWh: number }> = {};
  for (const c of allConsumptions) {
    const key = new Date(c.periodStart).toLocaleDateString('es', { month: 'short', year: '2-digit' });
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, kWh: 0 };
    monthlyMap[key].kWh += c.consumptionKwh;
  }
  const monthlyData = Object.values(monthlyMap);

  // Chart: emissions by scope
  const scopeMap: Record<string, number> = {};
  for (const e of allEmissions) scopeMap[e.scope] = (scopeMap[e.scope] ?? 0) + e.co2eKg;
  const scopeData = Object.entries(scopeMap).map(([scope, val]) => ({
    name: scope.replace('_', ' '), value: +val.toFixed(3), fill: SCOPE_COLOR[scope] ?? '#94a3b8',
  }));

  const orgColor = item.organization.brandColorPrimary ?? GREEN;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
        <button onClick={() => router.push('/energy')} style={{ background: 'white', border: '1px solid #d1fae5', borderRadius: 8, padding: '0.4rem 0.9rem', color: '#6b7280', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="bi bi-arrow-left" /> Volver
        </button>
      </div>

      {/* Item card */}
      <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid #d1fae5', marginBottom: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#064e3b', margin: 0 }}>{item.name}</h1>
            <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
              <i className="bi bi-patch-check-fill me-1" />CERTIFICADO
            </span>
          </div>
          {item.description && <p style={{ color: '#6b7280', fontSize: '0.88rem', margin: '0.4rem 0 0' }}>{item.description}</p>}
          <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.4rem' }}>
            <span><i className="bi bi-building me-1" />{item.organization.nombre}</span>
            <span style={{ margin: '0 0.75rem' }}>·</span>
            <span>ID: {item.id}</span>
            <span style={{ margin: '0 0.75rem' }}>·</span>
            <span>Registrado {new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <KpiTile icon="bi-cloud" label="CO₂e certificado" value={`${kpis.totalCo2eKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`} sub={`${(kpis.totalCo2eKg / 1000).toFixed(3)} t CO₂e`} color={GREEN} />
        <KpiTile icon="bi-lightning-charge" label="Energía consumida" value={`${(kpis.totalKwh / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} MWh`} sub={`${kpis.totalKwh.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`} color={TEAL} />
        <KpiTile icon="bi-sun" label="% Energía renovable" value={kpis.avgRenewableShare != null ? `${kpis.avgRenewableShare.toFixed(0)}%` : '—'} color="#f59e0b" />
        <KpiTile icon="bi-patch-check" label="Emisiones certificadas" value={`${kpis.certifiedEmissions}`} sub={`${kpis.sourcesCount} fuentes registradas`} color="#8b5cf6" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>

        {/* Consumption trend */}
        <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: '1px solid #d1fae5' }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151', marginBottom: '0.75rem' }}>
            <i className="bi bi-graph-up me-2" style={{ color: TEAL }} />Consumo energético mensual (kWh)
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TEAL} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={TEAL} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v.toLocaleString()} kWh`, 'Consumo']} />
              <Area type="monotone" dataKey="kWh" stroke={TEAL} strokeWidth={2} fill="url(#energyGrad)" dot={{ fill: TEAL, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Scope breakdown */}
        <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: '1px solid #d1fae5' }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151', marginBottom: '0.75rem' }}>
            <i className="bi bi-pie-chart me-2" style={{ color: GREEN }} />CO₂e por Scope GHG
          </div>
          {scopeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={scopeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={36} paddingAngle={3}>
                    {scopeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v.toFixed(3)} kg CO₂e`]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 8 }}>
                {Object.entries(scopeMap).map(([scope, kg]) => (
                  <ScopeBar key={scope} label={scope.replace('_', ' ')} kg={kg} total={kpis.totalCo2eKg} color={SCOPE_COLOR[scope] ?? '#94a3b8'} />
                ))}
              </div>
            </>
          ) : <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>Sin emisiones certificadas</p>}
        </div>
      </div>

      {/* Sources & Certifications */}
      {sources.map(source => (
        <div key={source.id} style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: '1px solid #d1fae5', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ width: 36, height: 36, background: `${TEAL}15`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`bi ${CARRIER_ICON[source.energyCarrier] ?? 'bi-lightning'}`} style={{ color: TEAL }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#064e3b' }}>{source.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {source.energyCarrier.replace(/_/g, ' ')}
                {source.capacityKw && ` · ${source.capacityKw.toLocaleString()} kW`}
                {source.renewableShare != null && ` · ${source.renewableShare}% renovable`}
                {source.countryOfOrigin && ` · ${source.countryOfOrigin}`}
              </div>
            </div>
            {source.guaranteeOfOriginId && (
              <span style={{ marginLeft: 'auto', background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                <i className="bi bi-award me-1" />GO {source.guaranteeOfOriginId}
              </span>
            )}
          </div>

          {/* Consumption + emission rows */}
          {source.consumptions.filter(c => c.emissions.length > 0).map(c => (
            <div key={c.id} style={{ borderTop: '1px solid #f0fdf4', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Período</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(c.periodStart).toLocaleDateString()} – {new Date(c.periodEnd).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Consumo</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.consumptionKwh.toLocaleString()} kWh</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Etapa</div>
                  <span style={{ background: `${STAGE_COLOR[c.lifecycleStage] ?? '#94a3b8'}20`, color: STAGE_COLOR[c.lifecycleStage] ?? '#94a3b8', borderRadius: 6, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>
                    {c.lifecycleStage.replace(/_/g, ' ')}
                  </span>
                </div>
                {c.measurementStandard && (
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Estándar</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#6b7280' }}>{c.measurementStandard}</div>
                  </div>
                )}
              </div>

              {c.emissions.map(e => (
                <div key={e.id} style={{ background: '#f0fdf4', borderRadius: 8, padding: '0.75rem', marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem 1rem' }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CO₂e</div>
                    <div style={{ fontWeight: 700, color: '#064e3b', fontSize: '1.05rem' }}>{e.co2eKg.toFixed(3)} kg</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scope</div>
                    <div style={{ fontWeight: 600, color: SCOPE_COLOR[e.scope] ?? '#374151', fontSize: 13 }}>{e.scope.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metodología</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace' }}>{e.calculationMethodology ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Factor emisión</div>
                    <div style={{ fontSize: 12 }}>{e.emissionFactor != null ? `${e.emissionFactor} kgCO₂e/kWh` : '—'}</div>
                  </div>
                  {e.emissionFactorSource && (
                    <div>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fuente factor</div>
                      <div style={{ fontSize: 12, color: '#374151' }}>{e.emissionFactorSource}</div>
                    </div>
                  )}
                  {e.gwpCharacterizationFactors && (
                    <div>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GWP</div>
                      <div style={{ fontSize: 12 }}>{e.gwpCharacterizationFactors}</div>
                    </div>
                  )}
                  {e.verifierBody && (
                    <div>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verificador</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#065f46' }}>
                        <i className="bi bi-patch-check-fill me-1" style={{ color: GREEN }} />{e.verifierBody}
                      </div>
                    </div>
                  )}
                  {e.verificationStandard && (
                    <div>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estándar verif.</div>
                      <div style={{ fontSize: 12, fontFamily: 'monospace' }}>{e.verificationStandard}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      {/* Footer */}
      <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: '2rem', paddingBottom: '2rem' }}>
        <i className="bi bi-shield-check me-1" style={{ color: GREEN }} />
        Datos certificados según ESPR / ISO 14067 · Powered by Datia
      </div>
    </div>
  );
}
