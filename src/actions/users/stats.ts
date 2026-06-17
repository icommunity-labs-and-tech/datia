'use server';

import { verifyAdminAuth } from './helpers';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { getCurrentTenant } from '@/lib/auth/tenant';

export interface UserRoleDistribution {
  name: string;
  value: number;
  color: string;
}

export interface MonthlyRegistration {
  month: string;
  count: number;
}

export interface UserStats {
  total: number;
  admins: number;
  operators: number;
  certificateSigners: number;
  roleDistribution: UserRoleDistribution[];
  monthlyRegistrations: MonthlyRegistration[];
}

export async function getUsersStats(): Promise<{ success: boolean; stats?: UserStats; error?: string }> {
  try {
    await verifyAdminAuth();

    const tenant = await getCurrentTenant();

    let users;
    if (tenant.userRole === 'SUPER_ADMIN') {
      users = await userRepository.findAll();
    } else {
      if (!tenant.organizationId) {
        throw new Error('ADMIN must have an organization assigned');
      }
      users = await userRepository.findByOrganization(tenant.organizationId);
    }

    const total = users.length;
    const admins = users.filter(u => u.role === 'ADMIN').length;
    const operators = users.filter(u => u.role === 'USER').length;
    const certificateSigners = users.filter(u => u.signsWithCertificate).length;

    const roleDistribution: UserRoleDistribution[] = [
      { name: 'ADMIN', value: admins, color: '#0d6efd' },
      { name: 'USER', value: operators, color: '#22c55e' },
    ].filter(r => r.value > 0);

    // Monthly registrations — last 6 months
    const now = new Date();
    const monthlyRegistrations: MonthlyRegistration[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const count = users.filter(u => {
        const created = new Date(u.createdAt);
        return (
          created.getFullYear() === d.getFullYear() &&
          created.getMonth() === d.getMonth()
        );
      }).length;
      // Short month label e.g. "Jan 25"
      const label = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      monthlyRegistrations.push({ month: label, count });
    }

    return {
      success: true,
      stats: { total, admins, operators, certificateSigners, roleDistribution, monthlyRegistrations },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
