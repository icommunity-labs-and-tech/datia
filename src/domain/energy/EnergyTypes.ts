export type EnergyCarrier =
  | 'ELECTRICITY' | 'NATURAL_GAS' | 'HYDROGEN' | 'SOLAR_THERMAL'
  | 'DISTRICT_HEATING' | 'DISTRICT_COOLING' | 'BIOMASS' | 'OIL' | 'COAL' | 'OTHER';

export type LifecycleStage =
  | 'MANUFACTURING' | 'TRANSPORT' | 'USE' | 'MAINTENANCE' | 'END_OF_LIFE';

export type EmissionScope = 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';

export type SystemBoundary =
  | 'CRADLE_TO_GATE' | 'CRADLE_TO_GRAVE' | 'GATE_TO_GATE' | 'CRADLE_TO_CRADLE';

export type EmissionVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface EnergySourceRecord {
  id: string;
  name: string;
  energyCarrier: EnergyCarrier;
  generationTechnology: string | null;
  capacityKw: number | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  installationDate: Date | null;
  renewableShare: number | null;
  guaranteeOfOriginId: string | null;
  countryOfOrigin: string | null;
  gridEmissionFactor: number | null;
  assetId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnergyConsumptionRecord {
  id: string;
  energySourceId: string;
  periodStart: Date;
  periodEnd: Date;
  consumptionKwh: number;
  consumptionMj: number | null;
  lifecycleStage: LifecycleStage;
  measurementStandard: string | null;
  operatingConditions: Record<string, unknown> | null;
  costAmount: number | null;
  currency: string | null;
  createdAt: Date;
}

export interface EmissionCertification {
  status: 'ISSUED' | 'CERTIFIED';
  hash: string | null;
  checkerUrl: string | null;
  blockExplorerUrl: string | null;
  certifiedAt: Date | null;
}

export interface EmissionRecord {
  id: string;
  energyConsumptionId: string;
  co2eKg: number;
  scope: EmissionScope;
  systemBoundary: SystemBoundary;
  emissionFactor: number | null;
  emissionFactorSource: string | null;
  calculationMethodology: string | null;
  gwpCharacterizationFactors: string | null;
  functionalUnit: string | null;
  verificationStatus: EmissionVerificationStatus;
  verifierBody: string | null;
  verificationStandard: string | null;
  certification: EmissionCertification | null;
  createdAt: Date;
}

export interface CreateEnergySourceInput {
  name: string;
  energyCarrier: EnergyCarrier;
  generationTechnology?: string;
  capacityKw?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  installationDate?: Date;
  renewableShare?: number;
  guaranteeOfOriginId?: string;
  countryOfOrigin?: string;
  gridEmissionFactor?: number;
  assetId: string;
}

export interface CreateEnergyConsumptionInput {
  energySourceId: string;
  periodStart: Date;
  periodEnd: Date;
  consumptionKwh: number;
  consumptionMj?: number;
  lifecycleStage: LifecycleStage;
  measurementStandard?: string;
  operatingConditions?: Record<string, unknown>;
  costAmount?: number;
  currency?: string;
}

export interface CreateEmissionRecordInput {
  energyConsumptionId: string;
  co2eKg: number;
  scope: EmissionScope;
  systemBoundary: SystemBoundary;
  emissionFactor?: number;
  emissionFactorSource?: string;
  calculationMethodology?: string;
  gwpCharacterizationFactors?: string;
  functionalUnit?: string;
  verifierBody?: string;
  verificationStandard?: string;
}

export interface EvidenceAuditRecord {
  blockchain_tx: string;
  timestamp: string;
  source: string;
  event_type: 'co2_certification_event';
  hash: string;
}

export interface EmissionVerificationReport {
  emissionRecordId: string;
  certificationId: string;
  /** True when the proof is intact and the record still says what was certified. */
  verified: boolean;
  evidence: EvidenceAuditRecord;
  /** The proof itself: does what iBS published still match what was sent? */
  proof: {
    /** base64(SHA-512) of the certified JSON, as iBS publishes it. */
    publishedChecksum: string;
    storedChecksum: string;
    intact: boolean;
  };
  /** The figures as they were certified. */
  certifiedData: {
    co2eKg: number | null;
    scope: string | null;
    systemBoundary: string | null;
    verifierBody: string | null;
    verificationStandard: string | null;
    certifiedAt: string;
  };
  /** Where the record today no longer matches what was certified. */
  discrepancies: string[];
}

export class EnergyValidationError extends Error {
  readonly _tag = 'EnergyValidationError';
  constructor(message: string) {
    super(message);
    this.name = 'EnergyValidationError';
  }
}

export class EnergyNotFoundError extends Error {
  readonly _tag = 'EnergyNotFoundError';
  constructor(id: string) {
    super(`Energy record not found: ${id}`);
    this.name = 'EnergyNotFoundError';
  }
}

/** One month of an aggregated series, keyed as YYYY-MM so the client formats it. */
export interface MonthlyPoint {
  month: string;
  value: number;
}

/**
 * Totals computed over every record of the organisation, not over the page the
 * table shows. The listing is paginated; these figures are not.
 */
export interface EnergyConsumptionTotals {
  records: number;
  totalKwh: number;
  monthly: MonthlyPoint[];
}

export interface EmissionTotals {
  records: number;
  verified: number;
  totalCo2eKg: number;
  monthly: MonthlyPoint[];
}

/**
 * One source's own monthly consumption, plus its current emission factor —
 * everything a projection (#21) needs to extrapolate that source and turn its
 * projected consumption into projected emissions.
 */
export interface SourceMonthlySeries {
  sourceId: string;
  sourceName: string;
  monthly: MonthlyPoint[];
  /** The most recent emission factor recorded for this source, if any. */
  currentEmissionFactor: number | null;
}
