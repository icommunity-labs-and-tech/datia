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
  installationDate: Date | null;
  renewableShare: number | null;
  guaranteeOfOriginId: string | null;
  countryOfOrigin: string | null;
  gridEmissionFactor: number | null;
  itemId: string;
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
  createdAt: Date;
}

export interface CreateEnergySourceInput {
  name: string;
  energyCarrier: EnergyCarrier;
  generationTechnology?: string;
  capacityKw?: number;
  location?: string;
  installationDate?: Date;
  renewableShare?: number;
  guaranteeOfOriginId?: string;
  countryOfOrigin?: string;
  gridEmissionFactor?: number;
  itemId: string;
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
  stateId: string;
  verified: boolean;
  evidence: EvidenceAuditRecord;
  originalData: {
    co2eKg: number;
    scope: EmissionScope;
    systemBoundary: SystemBoundary;
    verifierBody: string;
    verificationStandard: string;
    certifiedAt: string;
  };
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
