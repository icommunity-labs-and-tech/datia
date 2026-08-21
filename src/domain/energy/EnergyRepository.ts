import type { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';
import type {
  EnergySourceRecord,
  EnergyConsumptionRecord,
  EmissionRecord,
  CreateEnergySourceInput,
  CreateEnergyConsumptionInput,
  CreateEmissionRecordInput,
  EnergyConsumptionTotals,
  EmissionTotals,
} from './EnergyTypes';

export interface EnergyRepository {
  // Energy Sources — filtered by org via itemId → Item.organizationId
  createSource(organizationId: string, input: CreateEnergySourceInput): Promise<EnergySourceRecord>;
  findSourcesByOrganization(organizationId: string, limit?: number, pagination?: CursorPaginationParams): Promise<CursorPaginationResult<EnergySourceRecord>>;
  findSourceById(organizationId: string, id: string): Promise<EnergySourceRecord | null>;

  // Energy Consumption — filtered by org via energySourceId → EnergySource → Item
  createConsumption(organizationId: string, input: CreateEnergyConsumptionInput): Promise<EnergyConsumptionRecord>;
  findConsumptionByOrganization(organizationId: string, limit?: number, pagination?: CursorPaginationParams): Promise<CursorPaginationResult<EnergyConsumptionRecord>>;
  getConsumptionTotals(organizationId: string): Promise<EnergyConsumptionTotals>;
  getEmissionTotals(organizationId: string): Promise<EmissionTotals>;
  findConsumptionById(organizationId: string, id: string): Promise<EnergyConsumptionRecord | null>;

  // Emission Records — filtered by org via energyConsumptionId → … → Item
  createEmission(organizationId: string, input: CreateEmissionRecordInput): Promise<EmissionRecord>;
  findEmissionsByOrganization(organizationId: string, limit?: number, pagination?: CursorPaginationParams): Promise<CursorPaginationResult<EmissionRecord>>;
  findEmissionById(organizationId: string, id: string): Promise<EmissionRecord | null>;
}
