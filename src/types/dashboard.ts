export interface DashboardKPIs {
  totalPassports: number;
  backedPassports: number;
  pendingPassports: number;
  activePassports: number;
  statesThisMonth: number;
  evidencesGenerated: number;
  backupRate: number;
  activeUsers: number;
  verifiedUsers: number;
}

export interface MonthlyActivity {
  month: string;
  usersRegistered: number;
  itemsCreated: number;
}

export interface CategoryDistribution {
  category: string;
  itemCount: number;
  percentage: number;
}

export interface BackupStatus {
  user: string;
  statesCreated: number;
  backedStates: number;
  pendingStates: number;
  total: number;
}

export interface BackupStatusByUser {
  user: string;
  totalStates: number;
  backedStates: number;
  pendingStates: number;
}

export interface UserActivity {
  userId: string;
  userName: string;
  userRole: string;
  statesCreated: number;
  lastActivity: Date;
}
