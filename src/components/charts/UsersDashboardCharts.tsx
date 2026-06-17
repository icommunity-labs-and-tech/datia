'use client';

import { useEffect, useState } from 'react';
import { Card, Col, Row, Spinner } from 'react-bootstrap';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { getUsersStats, type UserStats } from '@/actions/users/stats';
import { colors, axisProps, gridProps, tooltipStyle } from './theme';

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  icon: string;
  accentClass: string;
}

function KpiCard({ label, value, icon, accentClass }: KpiCardProps) {
  return (
    <Col md={3} sm={6} className="mb-3">
      <Card className={`glass-card kpi-card ${accentClass} border-0 h-100`}>
        <Card.Body className="py-3 d-flex flex-column align-items-center justify-content-center">
          <div className="kpi-icon mb-2">
            <i className={`bi ${icon} fs-4`} />
          </div>
          <div className="kpi-value mb-1">{value}</div>
          <small className="kpi-label text-center">{label}</small>
        </Card.Body>
      </Card>
    </Col>
  );
}

// ─── Role Distribution Pie ────────────────────────────────────────────────────

function RoleDistributionChart({ stats, t }: { stats: UserStats; t: (k: string) => string }) {
  const labelled = stats.roleDistribution.map(r => ({
    ...r,
    name: r.name === 'ADMIN' ? t('roleAdmin') : t('roleOperator'),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const { name, value } = payload[0].payload;
      return (
        <div style={tooltipStyle} className="px-3 py-2">
          <strong>{name}</strong>: {value}
        </div>
      );
    }
    return null;
  };

  if (!labelled.length) {
    return (
      <div className="d-flex justify-content-center align-items-center text-muted" style={{ height: 220 }}>
        <div className="text-center">
          <i className="bi bi-people fs-1" />
          <p className="mt-2">{t('noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={330}>
      <PieChart>
        <Pie
          data={labelled}
          cx="50%"
          cy="43%"
          innerRadius="33%"
          outerRadius="54%"
          paddingAngle={3}
          dataKey="value"
        >
          {labelled.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Monthly Registrations Bar ────────────────────────────────────────────────

function MonthlyRegistrationsChart({ stats, t }: { stats: UserStats; t: (k: string) => string }) {
  const hasData = stats.monthlyRegistrations.some(m => m.count > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div style={tooltipStyle} className="px-3 py-2">
          <p className="mb-1"><strong>{label}</strong></p>
          <p style={{ color: colors.blue }}>
            {t('registrations')}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!hasData) {
    return (
      <div className="d-flex justify-content-center align-items-center text-muted" style={{ height: 220 }}>
        <div className="text-center">
          <i className="bi bi-bar-chart fs-1" />
          <p className="mt-2">{t('noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={stats.monthlyRegistrations} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" fill={colors.blue} radius={[4, 4, 0, 0]} name={t('registrations')} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UsersDashboardCharts() {
  const t = useTranslations('usersPage.charts');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUsersStats().then(result => {
      if (result.success && result.stats) {
        setStats(result.stats);
      } else {
        setError(result.error ?? 'Unknown error');
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center mb-4" style={{ height: 180 }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* KPI row */}
      <Row className="text-center mb-2">
        <KpiCard label={t('totalUsers')} value={stats.total} icon="bi-people-fill" accentClass="kpi-accent-1" />
        <KpiCard label={t('admins')} value={stats.admins} icon="bi-shield-check" accentClass="kpi-accent-1" />
        <KpiCard label={t('operators')} value={stats.operators} icon="bi-person-badge" accentClass="kpi-accent-2" />
        <KpiCard label={t('certificateSigners')} value={stats.certificateSigners} icon="bi-patch-check-fill" accentClass="kpi-accent-3" />
      </Row>

      {/* Charts row */}
      <Row>
        <Col md={5} className="mb-3">
          <Card className="glass-card border-0 h-100">
            <Card.Body>
              <h6 className="mb-3 fw-semibold text-muted">{t('roleDistribution')}</h6>
              <RoleDistributionChart stats={stats} t={t} />
            </Card.Body>
          </Card>
        </Col>
        <Col md={7} className="mb-3">
          <Card className="glass-card border-0 h-100">
            <Card.Body>
              <h6 className="mb-3 fw-semibold text-muted">{t('monthlyRegistrations')}</h6>
              <MonthlyRegistrationsChart stats={stats} t={t} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
