export type FraudReportStatus = 'PENDING' | 'UNDER_REVIEW' | 'CONFIRMED' | 'DISMISSED';

export interface FraudReport {
  id: string;
  itemId: string;
  organizationId: string;
  acquiredAt: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  comments: string | null;
  imageUrls: string[];
  status: FraudReportStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface FraudReportWithItem extends FraudReport {
  item: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
}

export interface CreateFraudReportInput {
  itemId: string;
  organizationId: string;
  acquiredAt?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  comments?: string;
  imageUrls?: string[];
}

export interface UpdateFraudReportInput {
  status?: FraudReportStatus;
}
