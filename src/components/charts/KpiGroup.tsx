
import { Card, Col, Row } from 'react-bootstrap';
import '../Box.css';
import './KpiGroup.css';

type KPI = {
  label: string;
  value: number | string;
};

export default function KpiGroup({ kpis }: { kpis: KPI[] }) {
  return (
    <Row className="text-center">
      {kpis.map((kpi, index) => (
        <Col key={index} md={4} className="mb-3">
          <Card className={`glass-card kpi-card kpi-accent-${(index % 3) + 1} border-0`}>
            <Card.Body className="py-3 d-flex flex-column align-items-center justify-content-center">
              <div className="kpi-value mb-1">{kpi.value}</div>
              <small className="kpi-label">{kpi.label}</small>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
