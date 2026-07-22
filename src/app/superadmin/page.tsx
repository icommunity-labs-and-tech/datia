'use client';

import { Card, Row, Col, Button } from '@/components/legacy/bootstrap-compat';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  return (
    <div>
      <Row className="g-4 mb-5">
        <Col md={6} lg={4}>
          <Card 
            className="h-100 shadow-sm border-0"
            style={{
              transition: 'all 0.3s ease',
              borderRadius: '16px',
              border: '1px solid #e5e7eb'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(220, 38, 38, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
          >
            <Card.Body className="text-center p-4">
              <div 
                className="mb-4"
                style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="bi bi-building text-danger" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <Card.Title style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
                Organizaciones
              </Card.Title>
              <Card.Text className="text-muted mb-4" style={{ minHeight: '48px' }}>
                Crea y gestiona organizaciones con sus administradores
              </Card.Text>
              <Link href="/superadmin/organizations" className="text-decoration-none">
                <Button 
                  variant="danger" 
                  className="w-100"
                  style={{
                    borderRadius: '10px',
                    padding: '10px',
                    fontWeight: 600,
                    border: 'none',
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    boxShadow: '0 4px 6px rgba(220, 38, 38, 0.2)'
                  }}
                >
                  <i className="bi bi-building-add me-2"></i>
                  Gestionar Organizaciones
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={4}>
          <Card
            className="h-100 shadow-sm border-0"
            style={{
              transition: 'all 0.3s ease',
              borderRadius: '16px',
              border: '1px solid #e5e7eb'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
          >
            <Card.Body className="text-center p-4">
              <div
                className="mb-4"
                style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="bi bi-chat-dots text-primary" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <Card.Title style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
                Mensajes de Soporte
              </Card.Title>
              <Card.Text className="text-muted mb-4" style={{ minHeight: '48px' }}>
                Revisa y gestiona los mensajes de soporte de las organizaciones
              </Card.Text>
              <Link href="/superadmin/support-messages" className="text-decoration-none">
                <Button
                  variant="primary"
                  className="w-100"
                  style={{
                    borderRadius: '10px',
                    padding: '10px',
                    fontWeight: 600,
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)'
                  }}
                >
                  <i className="bi bi-chat-dots me-2"></i>
                  Ver Mensajes
                </Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={4}>
          <Card 
            className="h-100 shadow-sm border-0"
            style={{
              transition: 'all 0.3s ease',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              opacity: 0.7
            }}
          >
            <Card.Body className="text-center p-4">
              <div 
                className="mb-4"
                style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="bi bi-gear text-secondary" style={{ fontSize: '2.5rem' }}></i>
              </div>
              <Card.Title style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
                Configuración
              </Card.Title>
              <Card.Text className="text-muted mb-4" style={{ minHeight: '48px' }}>
                Ajustes globales del sistema
              </Card.Text>
              <Button 
                variant="outline-secondary" 
                className="w-100" 
                disabled
                style={{
                  borderRadius: '10px',
                  padding: '10px',
                  fontWeight: 500
                }}
              >
                <i className="bi bi-gear me-2"></i>
                Próximamente
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}




