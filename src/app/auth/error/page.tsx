'use client';

export const dynamic = 'force-dynamic';

import { Container, Row, Col, Card, Button } from '@/components/legacy/bootstrap-compat';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';

function AuthErrorContent() {
  const t = useTranslations('auth.error');
  const tCommon = useTranslations('common.actions');
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');

  const getErrorDetails = () => {
    switch (error) {
      case 'AccessDenied':
        return {
          title: t('accessDenied.title'),
          message: t('accessDenied.message'),
          description: t('accessDenied.description'),
          action: t('accessDenied.action'),
          actionUrl: '/dashboard'
        };
      case 'Unauthorized':
        return {
          title: t('unauthorized.title'),
          message: t('unauthorized.message'),
          description: t('unauthorized.description'),
          action: t('unauthorized.action'),
          actionUrl: '/auth/login'
        };
      case 'Configuration':
        return {
          title: t('configuration.title'),
          message: t('configuration.message'),
          description: t('configuration.description'),
          action: t('configuration.action'),
          actionUrl: '/'
        };
      default:
        return {
          title: t('default.title'),
          message: t('default.message'),
          description: t('default.description'),
          action: t('default.action'),
          actionUrl: '/auth/login'
        };
    }
  };

  const errorDetails = getErrorDetails();

  return (
    <Container fluid className="auth-error">
      <Row className="vh-100 align-items-center justify-content-center">
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card className="shadow text-center">
            <Card.Body className="p-4">
              <div className="error-icon mb-4">
                <span className="error-icon-symbol">⚠️</span>
              </div>
              
              <h2 className="h4 mb-3 text-danger">{errorDetails.title}</h2>
              <p className="text-muted mb-3">{errorDetails.message}</p>
              <p className="small text-muted mb-4">{errorDetails.description}</p>

              <div className="d-grid gap-2">
                <Link href={errorDetails.actionUrl} passHref>
                  <Button variant="primary" className="w-100">
                    {errorDetails.action}
                  </Button>
                </Link>
                
                <Button 
                  variant="outline-secondary" 
                  className="w-100"
                  onClick={() => router.back()}
                >
                  {t('goBack')}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <style jsx>{`
        .auth-error {
          min-height: 100vh;
          background: #f8f9fa;
        }
        
        .auth-error .card {
          border: none;
          border-radius: 8px;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        }
        
        .error-icon {
          font-size: 3rem;
          color: #dc3545;
        }
        
        .error-icon-symbol {
          filter: none;
        }
        
        .auth-error .btn-primary {
          background-color: #0d6efd;
          border-color: #0d6efd;
          border-radius: 6px;
          padding: 10px 16px;
          font-weight: 500;
        }
        
        .auth-error .btn-primary:hover {
          background-color: #0b5ed7;
          border-color: #0a58ca;
        }
        
        .auth-error .btn-outline-secondary {
          border-radius: 6px;
          padding: 10px 16px;
        }
      `}      </style>
    </Container>
  );
}

export default function AuthErrorPage() {
  const t = useTranslations('auth.error');
  return (
    <Suspense fallback={
      <Container fluid className="auth-error">
        <Row className="vh-100 align-items-center justify-content-center">
          <Col xs={12} sm={8} md={6} lg={4}>
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">{t('loading')}</span>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
