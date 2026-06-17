'use client';

import { useEffect, Suspense } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { appConfig } from '@/config/app';

function AppsSelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Si hay un parámetro de error, redirigir al login apropiado
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'AccessDenied' || error === 'Unauthorized') {
      // Intentar detectar el contexto basado en el referrer
      if (typeof window !== 'undefined') {
        const referrer = document.referrer;
        if (referrer.includes('/dashboard') || referrer.includes('/admin')) {
          router.push('/auth/admin/login?error=' + error);
        } else if (referrer.includes('/operator')) {
          router.push('/auth/operator/login?error=' + error);
        }
      }
    }
  }, [searchParams, router]);

  return (
    <Container fluid className="apps-select">
      <Row className="vh-100 align-items-center justify-content-center">
        <Col xs={12} sm={10} md={8} lg={6} xl={4}>
          <div className="text-center mb-5">
            <h1 className="display-4 mb-3">{appConfig.name}</h1>
            <p className="lead text-muted">{appConfig.description}</p>
          </div>

          <Row className="g-4 mb-4">
            <Col md={6}>
              <Link href="/auth/admin/login" className="text-decoration-none">
                <Card className="h-100 auth-card admin-card border-0 shadow-lg">
                  <Card.Body className="text-center p-4">
                    <div className="mb-3">
                      <i className="bi bi-shield-lock display-4 text-primary"></i>
                    </div>
                    <h3 className="h5 mb-3 text-primary fw-bold">Admin</h3>
                    <p className="text-muted mb-0">
                      Acceso exclusivo para administradores del sistema
                    </p>
                  </Card.Body>
                </Card>
              </Link>
            </Col>

            <Col md={6}>
              <Link href="/auth/operator/login" className="text-decoration-none">
                <Card className="h-100 auth-card operator-card border-0 shadow-lg">
                  <Card.Body className="text-center p-4">
                    <div className="mb-3">
                      <i className="bi bi-phone display-4 text-success"></i>
                    </div>
                    <h3 className="h5 mb-3 text-success fw-bold">Operador</h3>
                    <p className="text-muted mb-0">
                      Acceso para operadores de campo
                    </p>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          </Row>

          <Row className="g-4">
            <Col md={6} className="mx-auto">
              <Link href="/customer" className="text-decoration-none">
                <Card className="h-100 auth-card customer-card border-0 shadow-lg">
                  <Card.Body className="text-center p-4">
                    <div className="mb-3">
                      <i className="bi bi-people display-4 text-info"></i>
                    </div>
                    <h3 className="h5 mb-3 text-info fw-bold">Portal Cliente</h3>
                    <p className="text-muted mb-0">
                      Acceso para usuario final
                    </p>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          </Row>

          <div className="text-center mt-5">
            <small className="text-muted">
              Selecciona el tipo de acceso que necesitas
            </small>
          </div>
        </Col>
      </Row>

      <style jsx>{`
        .apps-select {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #11998e 100%);
        }
        
        .auth-card {
          border-radius: 20px;
          transition: all 0.3s ease;
          cursor: pointer;
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.95);
        }
        
        .auth-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
        }
        
        .admin-card:hover {
          background: rgba(102, 126, 234, 0.1);
        }
        
        .operator-card:hover {
          background: rgba(17, 153, 142, 0.1);
        }
        
        .customer-card:hover {
          background: rgba(23, 162, 184, 0.1);
        }
        
        .auth-card .card-body {
          transition: all 0.3s ease;
        }
        
        .auth-card:hover .card-body {
          padding: 2rem !important;
        }
        
        .auth-card:hover i {
          transform: scale(1.1);
          transition: transform 0.3s ease;
        }
      `}</style>
    </Container>
  );
}

export default function AppsSelector() {
  return (
    <Suspense fallback={
      <Container fluid className="apps-select">
        <Row className="vh-100 align-items-center justify-content-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={4}>
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    }>
      <AppsSelectContent />
    </Suspense>
  );
}
