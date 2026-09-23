/** Payload of GET /api/energy/item/[assetId] — the ESPR certification report. */

export interface ReportEmission {
  id: string;
  co2eKg: number;
  scope: string;
  systemBoundary: string;
  emissionFactor: number | null;
  emissionFactorSource: string | null;
  calculationMethodology: string | null;
  gwpCharacterizationFactors: string | null;
  verifierBody: string | null;
  verificationStandard: string | null;
  verificationStatus: string;
  createdAt: string;
}

export interface ReportConsumption {
  id: string;
  periodStart: string;
  periodEnd: string;
  consumptionKwh: number;
  consumptionMj: number | null;
  lifecycleStage: string;
  measurementStandard: string | null;
  costAmount: number | null;
  currency: string | null;
  emissions: ReportEmission[];
}

export interface ReportSource {
  id: string;
  name: string;
  energyCarrier: string;
  generationTechnology: string | null;
  capacityKw: number | null;
  location: string | null;
  renewableShare: number | null;
  guaranteeOfOriginId: string | null;
  countryOfOrigin: string | null;
  gridEmissionFactor: number | null;
  installationDate: string | null;
  consumptions: ReportConsumption[];
}

export interface EnergyReport {
  item: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    templateFields: unknown;
    createdAt: string;
    organization: { name: string; logoUrl: string | null; brandColorPrimary: string | null };
  };
  sources: ReportSource[];
  kpis: {
    totalKwh: number;
    totalCo2eKg: number;
    certifiedEmissions: number;
    avgRenewableShare: number | null;
    sourcesCount: number;
  };
}
