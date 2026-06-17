'use client';

import { Col, Row } from 'react-bootstrap';
import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import Box from '@/components/Box';
import { Divider } from '@/components/Divider';
import { axisProps, gridProps, tooltipStyle } from './theme';

export interface StatCard {
  color: string;
  value: number;
  label: string;
  active: boolean;
  onClick?: () => void;
}

export interface PieEntry {
  key: string;
  value: number;
  name: string;
  color: string;
  [k: string]: unknown;
}

export interface BarEntry {
  key: number; // YYYYMM
  label: string;
  count: number;
  [k: string]: unknown;
}

interface StatsPanelProps {
  title: string;
  statCards: StatCard[];
  pie: {
    title: string;
    data: PieEntry[];
    selectedKey: string | null;
    onSelect: (key: string | null) => void;
    clearLabel: string;
  };
  bar?: {
    title: string;
    data: BarEntry[];
    selectedKey: number | null;
    onSelect: (key: number | null) => void;
    entryLabel: string;
  };
}

export default function StatsPanel({ title, statCards, pie, bar }: StatsPanelProps) {
  const activeMonthLabel = bar?.selectedKey != null
    ? (bar.data.find(m => m.key === bar.selectedKey)?.label ?? null)
    : null;

  const PieChart_ = (
    <>
      <div className="d-flex align-items-center justify-content-between" style={{ marginBottom: 8 }}>
        <div style={sectionLabelStyle}>{pie.title}</div>
        {pie.selectedKey !== null && (
          <button onClick={() => pie.onSelect(null)} style={clearBtnStyle}>
            <i className="bi bi-x-circle" /> {pie.clearLabel}
          </button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={330}>
        <PieChart>
          <Pie
            data={pie.data}
            cx="50%"
            cy="43%"
            innerRadius="33%"
            outerRadius="54%"
            dataKey="value"
            paddingAngle={3}
            style={{ cursor: 'pointer' }}
            onClick={(entry: any) => {
              const clicked = entry?.key as string;
              pie.onSelect(pie.selectedKey === clicked ? null : clicked);
            }}
          >
            {pie.data.map(({ key, color }) => (
              <Cell
                key={key}
                fill={color}
                opacity={pie.selectedKey === null || pie.selectedKey === key ? 1 : 0.25}
                stroke={pie.selectedKey === key ? color : 'none'}
                strokeWidth={pie.selectedKey === key ? 3 : 0}
              />
            ))}
          </Pie>
          <RechartTooltip
            formatter={(value: number, name: string) => [value, name]}
            contentStyle={tooltipStyle}
          />
          <Legend
            onClick={(entry: any) => {
              const clicked = entry?.payload?.key as string | undefined;
              if (clicked) pie.onSelect(pie.selectedKey === clicked ? null : clicked);
            }}
            formatter={(value, entry: any) => {
              const key = entry?.payload?.key as string | undefined;
              const isActive = pie.selectedKey === null || pie.selectedKey === key;
              return (
                <span style={{ fontSize: '0.78rem', color: isActive ? '#1e293b' : '#94a3b8', cursor: 'pointer', fontWeight: pie.selectedKey === key ? 600 : 400 }}>
                  {value}
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </>
  );

  return (
    <Box>
      <div className="d-flex align-items-center gap-2 mb-2">
        <i className={`bi ${bar ? 'bi-bar-chart' : 'bi-pie-chart'}`} style={{ fontSize: '1.1rem' }} />
        <h5 className="mb-0">{title}</h5>
      </div>
      <Divider />

      {bar ? (
        /* Layout with bar: stat cards row + pie (4) + bar (8) */
        <>
          <div className="d-flex gap-3 flex-wrap mb-4">
            {statCards.map((card, i) => (
              <div
                key={i}
                style={{ ...statCardStyle(card.color, card.active), cursor: card.onClick ? 'pointer' : 'default' }}
                onClick={card.onClick}
              >
                <div style={{ fontSize: '2rem', fontWeight: 700, color: card.color, lineHeight: 1 }}>{card.value}</div>
                <div style={statLabelStyle}>{card.label}</div>
              </div>
            ))}
          </div>
          <Row>
            <Col md={4}>{PieChart_}</Col>
            <Col md={8}>
              <div className="d-flex align-items-center justify-content-between" style={{ marginBottom: 8 }}>
                <div style={sectionLabelStyle}>{bar.title}</div>
                {bar.selectedKey !== null && (
                  <button onClick={() => bar.onSelect(null)} style={clearBtnStyle}>
                    <i className="bi bi-x-circle" /> {activeMonthLabel}
                  </button>
                )}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={bar.data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} tick={{ ...axisProps.tick, fontSize: 11 }} />
                  <YAxis {...axisProps} allowDecimals={false} width={28} />
                  <RechartTooltip
                    formatter={(value: number) => [value, bar.entryLabel]}
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    name={bar.entryLabel}
                    style={{ cursor: 'pointer' }}
                    onClick={(data: any) => {
                      const key = data?.key as number | undefined;
                      if (key != null) bar.onSelect(bar.selectedKey === key ? null : key);
                    }}
                  >
                    {bar.data.map(entry => (
                      <Cell
                        key={entry.key}
                        fill="#3b82f6"
                        opacity={bar.selectedKey === null || bar.selectedKey === entry.key ? 1 : 0.25}
                        stroke={bar.selectedKey === entry.key ? '#1d4ed8' : 'none'}
                        strokeWidth={bar.selectedKey === entry.key ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Col>
          </Row>
        </>
      ) : (
        /* Layout without bar: pie (5) + stat cards 2×2 grid (7) */
        <Row className="align-items-center">
          <Col md={5}>{PieChart_}</Col>
          <Col md={7}>
            <Row className="g-3">
              {statCards.map((card, i) => (
                <Col xs={6} key={i}>
                  <div
                    style={{ ...gridCardStyle(card.color, card.active), cursor: card.onClick ? 'pointer' : 'default' }}
                    onClick={card.onClick}
                  >
                    <div style={{ fontSize: '2.2rem', fontWeight: 700, color: card.color, lineHeight: 1 }}>{card.value}</div>
                    <div style={statLabelStyle}>{card.label}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      )}
    </Box>
  );
}

export function buildMonthlyBarData(items: { createdAt: Date | string }[]): BarEntry[] {
  const map = new Map<number, BarEntry>();
  items.forEach(item => {
    const d = new Date(item.createdAt);
    const key = d.getFullYear() * 100 + d.getMonth();
    const label = d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
    const existing = map.get(key);
    if (existing) existing.count++;
    else map.set(key, { key, label, count: 1 });
  });
  return Array.from(map.entries()).sort(([a], [b]) => a - b).map(([, v]) => v);
}

const statCardStyle = (color: string, active = false): React.CSSProperties => ({
  flex: '1 1 110px',
  padding: '14px 18px',
  borderRadius: 10,
  border: `2px solid ${active ? color : `${color}22`}`,
  background: active ? `${color}18` : `${color}08`,
  transition: 'border-color 0.15s, background 0.15s',
  boxShadow: active ? `0 0 0 3px ${color}22` : 'none',
});

const gridCardStyle = (color: string, active = false): React.CSSProperties => ({
  padding: '18px 20px',
  borderRadius: 12,
  border: `2px solid ${active ? color : `${color}22`}`,
  background: active ? `${color}18` : `${color}08`,
  transition: 'border-color 0.15s, background 0.15s',
  boxShadow: active ? `0 0 0 3px ${color}22` : 'none',
  height: '100%',
});

const statLabelStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: '#64748b',
  marginTop: 6,
  fontWeight: 500,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const clearBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  fontSize: '0.75rem',
  color: '#64748b',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 3,
};
