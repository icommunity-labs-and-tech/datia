export interface ItemState {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  backed?: boolean;
  backedAt?: string;
  evidenceID?: string;
  imageUrls?: string[];
}

export interface ItemCategory {
  id: string;
  name: string;
  description?: string;
}

export type ItemData = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  templateFields: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  evidenceID?: string | null;
  createdBy?: { name: string; email: string } | null;
  organization?: {
    name: string;
    logoUrl: string | null;
    brandColorPrimary: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    description: string;
  };
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
