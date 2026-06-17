import type { CreateFraudReportInput, FraudReport, FraudReportStatus, FraudReportWithItem, UpdateFraudReportInput } from './FraudReport';

export interface FraudReportRepository {
  create(input: CreateFraudReportInput): Promise<FraudReport>;
  findById(id: string, organizationId: string): Promise<FraudReportWithItem | null>;
  findByOrganization(
    organizationId: string,
    filters?: { status?: FraudReportStatus; itemId?: string },
  ): Promise<FraudReportWithItem[]>;
  findByItem(itemId: string, organizationId: string): Promise<FraudReport[]>;
  update(id: string, organizationId: string, input: UpdateFraudReportInput): Promise<FraudReport>;
  delete(id: string, organizationId: string): Promise<void>;
  countPending(organizationId: string): Promise<number>;
}
