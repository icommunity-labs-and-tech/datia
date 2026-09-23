export interface ItemState {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  backed?: boolean;
  backedAt?: string;
  evidenceId?: string;
  imageUrls?: string[];
}

export interface ItemCategory {
  id: string;
  name: string;
  description?: string;
}

export type AssetData = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  evidenceId?: string | null;
  createdBy?: { name: string; email: string } | null;
  organization?: {
    name: string;
    logoUrl: string | null;
    brandColorPrimary: string | null;
  } | null;
  energyCertifications?: EnergyCertification[];
};

export type EnergyCertification = {
  id: string;
  co2eKg: number;
  scope: string;
  systemBoundary: string;
  calculationMethodology: string | null;
  verifierBody: string | null;
  verificationStandard: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  periodStart: string;
  periodEnd: string;
  consumptionKwh: number;
  energyCarrier: string;
  createdAt: string;
};
