export interface DashboardKPIs {
  totalItems: number;
  /** Assets with activity in the last 90 days. */
  activeItems: number;
  /** Proofs anchored in iBS, whether or not they are on chain yet. */
  certifications: number;
  certifiedCertifications: number;
  issuedCertifications: number;
  certificationsThisMonth: number;
  activeUsers: number;
  verifiedUsers: number;
}

export interface MonthlyActivity {
  month: string;
  usersRegistered: number;
  itemsCreated: number;
}

