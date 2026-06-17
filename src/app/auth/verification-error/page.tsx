'use client';

import React, { useState } from 'react';
import { Container, Row, Col, Card, Alert, Button } from 'react-bootstrap';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function VerificationErrorPage() {
  const t = useTranslations('auth.verification');
  // KYC is now at organization level, not user level
  // This page is kept for backward compatibility but functionality is removed

  const handleContactSupport = () => {
    // Aquí podrías redirigir a una página de contacto o abrir un modal
    window.open('mailto:soporte@tudominio.com?subject=Error en verificación de identidad', '_blank');
  };

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="shadow">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <i className="fas fa-exclamation-triangle text-danger" style={{ fontSize: '4rem' }}></i>
                  </div>
                  <h1 className="h3 text-danger mb-3">{t('title')}</h1>
                  <p className="text-muted">
                    {t('subtitle')}
                  </p>
                </div>

                <Alert variant="danger" className="mb-4">
                  <Alert.Heading>{t('whatHappened')}</Alert.Heading>
                  <p className="mb-0">
                    {t('description')}
                  </p>
                  <ul className="mb-0 mt-2">
                    <li>{t('reasons.documents')}</li>
                    <li>{t('reasons.incorrectInfo')}</li>
                    <li>{t('reasons.technicalIssues')}</li>
                    <li>{t('reasons.invalidDocuments')}</li>
                  </ul>
                </Alert>

                <Alert variant="info" className="mb-4">
                  <Alert.Heading>{t('importantNote')}</Alert.Heading>
                  <p className="mb-0">
                    {t('organizationLevel')}
                  </p>
                </Alert>

                <div className="d-grid gap-2">
                  <Button 
                    variant="outline-secondary" 
                    size="lg" 
                    onClick={handleContactSupport}
                    className="mb-3"
                  >
                    <i className="fas fa-envelope me-2"></i>
                    {t('contactSupport')}
                  </Button>

                  <div className="text-center">
                    <Link href="/auth/login" className="text-decoration-none">
                      <i className="fas fa-arrow-left me-1"></i>
                      {t('backToLogin')}
                    </Link>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <div className="text-center mt-4">
              <p className="text-muted small">
                {t('continueProblems')}
              </p>
            </div>
          </Col>
        </Row>
      </Container>

      <style jsx>{`
        .min-vh-100 {
          min-height: 100vh;
        }
        
        .shadow {
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
        
        .text-danger {
          color: #dc3545 !important;
        }
        
        .alert {
          border-left: 4px solid;
        }
        
        .alert-danger {
          border-left-color: #dc3545;
        }
        
        .alert-info {
          border-left-color: #0dcaf0;
        }
      `}</style>
    </div>
  );
}
