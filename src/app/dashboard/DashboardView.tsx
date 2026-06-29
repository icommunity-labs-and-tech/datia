'use client';

import { Row, Col } from 'react-bootstrap';
import { useTranslations } from 'next-intl';
import Box from '@/components/Box';
import BoxTitle from '@/components/BoxTitle';
import DashboardKPIs from '@/components/charts/DashboardKPIs';
import MonthlyActivityChart from '@/components/charts/MonthlyActivityChart';
import CategoryDistributionChart from '@/components/charts/CategoryDistributionChart';
import type { DashboardKPIs as DashboardKPIsType, MonthlyActivity, CategoryDistribution, BackupStatus, BackupStatusByUser } from '@/types/dashboard';

interface DashboardClientProps {
  pieData?: { name: string; value: number }[];
  kpis: DashboardKPIsType;
  monthlyActivity: MonthlyActivity[];
  categoryDistribution: CategoryDistribution[];
  backupStatus?: BackupStatus[];
  backupStatusByUser: BackupStatusByUser[];
}

export default function DashboardClient({
  pieData: _pieData,
  kpis,
  monthlyActivity,
  categoryDistribution,
  backupStatus: _backupStatus,
  backupStatusByUser: _backupStatusByUser,
}: DashboardClientProps) {
  const t = useTranslations('dashboard');

  return (
    <>
      <Row className="mb-2">
        <Col md={12}>
          <DashboardKPIs kpis={kpis} />
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={8}>
          <Box>
            <BoxTitle message={t('monthlyActivityTitle')} />
            <MonthlyActivityChart data={monthlyActivity} />
          </Box>
        </Col>
        <Col md={4}>
          <Box>
            <BoxTitle message={t('categoryDistributionTitle')} />
            <CategoryDistributionChart data={categoryDistribution} />
          </Box>
        </Col>
      </Row>

    </>
  );
}
