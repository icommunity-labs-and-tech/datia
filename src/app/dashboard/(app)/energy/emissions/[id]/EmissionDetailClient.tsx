'use client';

import Link from 'next/link';
import { Badge } from '@mantine/core';

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'yellow',
  VERIFIED: 'green',
  REJECTED: 'red',
};

interface Props {
  emission: any;
}

export default function EmissionDetailClient({ emission }: Props) {
  const consumption = emission.EnergyConsumption;
  const source = consumption.EnergySource;
  const item = source.Asset;

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link href="/dashboard/energy/emissions" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left me-1" /> Volver
        </Link>
        <h2 className="h4 mb-0">
          <i className="bi bi-cloud me-2 text-success" />
          Registro de Emisión
        </h2>
        <Badge color={STATUS_COLOR[emission.verificationStatus] ?? 'gray'}>
          {emission.verificationStatus}
        </Badge>
      </div>

      {/* Chain visualisation */}
      <div className="d-flex align-items-stretch gap-2 mb-4 flex-wrap">
        {[
          { icon: 'bi-box', label: 'Hardware', value: item.name, href: `/dashboard/assets/${item.id}` },
          { icon: 'bi-lightning-charge', label: 'Fuente', value: source.name, sub: source.energyCarrier },
          { icon: 'bi-speedometer2', label: 'Consumo', value: `${consumption.consumptionKwh} kWh`, sub: consumption.lifecycleStage },
          { icon: 'bi-cloud', label: 'Emisión', value: `${emission.co2eKg} kg CO₂e`, sub: emission.scope?.replace('_', ' ') },
        ].map((node, i, arr) => (
          <div key={i} className="d-flex align-items-center gap-2">
            <div className="card border-0 shadow-sm px-3 py-2 text-center" style={{ minWidth: 130 }}>
              <i className={`bi ${node.icon} text-primary mb-1`} />
              <div className="small text-muted">{node.label}</div>
              {node.href ? (
                <Link href={node.href} className="fw-semibold small text-decoration-none">{node.value}</Link>
              ) : (
                <div className="fw-semibold small">{node.value}</div>
              )}
              {node.sub && <div className="text-muted" style={{ fontSize: '0.7rem' }}>{node.sub}</div>}
            </div>
            {i < arr.length - 1 && <i className="bi bi-arrow-right text-muted" />}
          </div>
        ))}
      </div>

      <div className="row g-3">
        {/* Emission details */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent fw-semibold">
              <i className="bi bi-cloud me-2 text-success" />Datos de emisión
            </div>
            <div className="card-body">
              <dl className="row mb-0 small">
                <dt className="col-5 text-muted">CO₂e</dt>
                <dd className="col-7 fw-semibold">{emission.co2eKg} kg</dd>

                <dt className="col-5 text-muted">Scope GHG</dt>
                <dd className="col-7">{emission.scope?.replace('_', ' ')}</dd>

                <dt className="col-5 text-muted">Frontera</dt>
                <dd className="col-7">{emission.systemBoundary?.replace(/_/g, '-').toLowerCase()}</dd>

                <dt className="col-5 text-muted">Factor emisión</dt>
                <dd className="col-7">{emission.emissionFactor ?? '—'}</dd>

                <dt className="col-5 text-muted">Fuente factor</dt>
                <dd className="col-7">{emission.emissionFactorSource ?? '—'}</dd>

                <dt className="col-5 text-muted">Metodología</dt>
                <dd className="col-7">{emission.calculationMethodology ?? '—'}</dd>

                <dt className="col-5 text-muted">GWP</dt>
                <dd className="col-7">{emission.gwpCharacterizationFactors ?? 'IPCC AR6'}</dd>

                <dt className="col-5 text-muted">Unidad funcional</dt>
                <dd className="col-7">{emission.functionalUnit ?? '—'}</dd>

                <dt className="col-5 text-muted">Registrado</dt>
                <dd className="col-7">{new Date(emission.createdAt).toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent fw-semibold">
              <i className="bi bi-patch-check me-2 text-primary" />Verificación
            </div>
            <div className="card-body">
              <dl className="row mb-0 small">
                <dt className="col-5 text-muted">Estado</dt>
                <dd className="col-7">
                  <Badge color={STATUS_COLOR[emission.verificationStatus] ?? 'gray'}>
                    {emission.verificationStatus}
                  </Badge>
                </dd>

                <dt className="col-5 text-muted">Organismo</dt>
                <dd className="col-7">{emission.verifierBody ?? '—'}</dd>

                <dt className="col-5 text-muted">Estándar</dt>
                <dd className="col-7">{emission.verificationStandard ?? '—'}</dd>
              </dl>

              {emission.verificationStatus === 'PENDING' && (
                <div className="alert alert-warning small mt-3 mb-0 py-2">
                  <i className="bi bi-info-circle me-1" />
                  Pendiente de certificar. Usa <code>POST /api/v1/emissions/{emission.id}/certify</code>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Consumption */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent fw-semibold">
              <i className="bi bi-speedometer2 me-2 text-primary" />Consumo asociado
            </div>
            <div className="card-body">
              <dl className="row mb-0 small">
                <dt className="col-5 text-muted">Período</dt>
                <dd className="col-7">
                  {new Date(consumption.periodStart).toLocaleDateString()} →{' '}
                  {new Date(consumption.periodEnd).toLocaleDateString()}
                </dd>

                <dt className="col-5 text-muted">Consumo</dt>
                <dd className="col-7 fw-semibold">{consumption.consumptionKwh} kWh / {consumption.consumptionMj ?? (consumption.consumptionKwh * 3.6).toFixed(2)} MJ</dd>

                <dt className="col-5 text-muted">Etapa ciclo de vida</dt>
                <dd className="col-7">{consumption.lifecycleStage?.replace(/_/g, ' ')}</dd>

                <dt className="col-5 text-muted">Estándar medición</dt>
                <dd className="col-7">{consumption.measurementStandard ?? '—'}</dd>

                {consumption.costAmount && (
                  <>
                    <dt className="col-5 text-muted">Coste</dt>
                    <dd className="col-7">{consumption.costAmount} {consumption.currency}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        </div>

        {/* Energy source */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent fw-semibold">
              <i className="bi bi-lightning-charge me-2 text-warning" />Fuente de energía
            </div>
            <div className="card-body">
              <dl className="row mb-0 small">
                <dt className="col-5 text-muted">Nombre</dt>
                <dd className="col-7 fw-semibold">{source.name}</dd>

                <dt className="col-5 text-muted">Carrier</dt>
                <dd className="col-7">{source.energyCarrier}</dd>

                {source.generationTechnology && (
                  <>
                    <dt className="col-5 text-muted">Tecnología</dt>
                    <dd className="col-7">{source.generationTechnology}</dd>
                  </>
                )}

                {source.renewableShare != null && (
                  <>
                    <dt className="col-5 text-muted">% Renovable</dt>
                    <dd className="col-7">{source.renewableShare}%</dd>
                  </>
                )}

                {source.gridEmissionFactor && (
                  <>
                    <dt className="col-5 text-muted">Factor red</dt>
                    <dd className="col-7">{source.gridEmissionFactor} gCO₂/kWh</dd>
                  </>
                )}

                {source.countryOfOrigin && (
                  <>
                    <dt className="col-5 text-muted">País</dt>
                    <dd className="col-7">{source.countryOfOrigin}</dd>
                  </>
                )}

                {source.guaranteeOfOriginId && (
                  <>
                    <dt className="col-5 text-muted">GO/RECs</dt>
                    <dd className="col-7"><code className="small">{source.guaranteeOfOriginId}</code></dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
