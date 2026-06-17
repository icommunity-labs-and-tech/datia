'use client';

import { useState, useEffect } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { getOrganizationKyc } from '@/actions/organizations/get-organization-kyc';
import { retryOrganizationKyc } from '@/actions/organizations/retry-organization-kyc';

export default function OrganizationKycBanner() {
  const [kycInfo, setKycInfo] = useState<{
    verificationStatus: 'NOT_VERIFIED' | 'WAITING' | 'VERIFIED' | 'REJECTED';
    kycURL: string | null;
    organizationName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    const loadKycInfo = async () => {
      try {
        const result = await getOrganizationKyc();
        if (result.success && result.kycInfo) {
          setKycInfo(result.kycInfo);
        }
      } catch (error) {
        console.error('Error loading KYC info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadKycInfo();
  }, []);

  // Solo mostrar el banner si el KYC no est? verificado
  if (loading || !kycInfo || kycInfo.verificationStatus === 'VERIFIED') {
    return null;
  }

  const getVariant = () => {
    switch (kycInfo.verificationStatus) {
      case 'WAITING':
        return 'warning';
      case 'REJECTED':
        return 'danger';
      case 'NOT_VERIFIED':
      default:
        return 'info';
    }
  };

  const getMessage = () => {
    switch (kycInfo.verificationStatus) {
      case 'WAITING':
        return `La verificaci?n de identidad (KYC) de tu organizaci?n "${kycInfo.organizationName}" est? pendiente de aprobaci?n.`;
      case 'REJECTED':
        return `La verificaci?n de identidad (KYC) de tu organizaci?n "${kycInfo.organizationName}" fue rechazada. Por favor, reintenta el proceso.`;
      case 'NOT_VERIFIED':
      default:
        return `Tu organizaci?n "${kycInfo.organizationName}" a?n no ha completado la verificaci?n de identidad (KYC).`;
    }
  };

  const handleOpenKyc = async () => {
    // Siempre crear nueva firma, sin importar el estado actual
    setRetrying(true);
    setRetryError(null);
    
    try {
      const result = await retryOrganizationKyc();
      if (result.success && result.kycURL) {
        // Recargar información del KYC para reflejar los cambios
        const updatedResult = await getOrganizationKyc();
        if (updatedResult.success && updatedResult.kycInfo) {
          setKycInfo(updatedResult.kycInfo);
        }
        window.open(result.kycURL, '_blank', 'noopener,noreferrer');
      } else {
        setRetryError(result.error || 'Error al crear nueva firma');
      }
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Alert variant={getVariant()} className="mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
      <div className="d-flex align-items-center flex-grow-1">
        <i className={`bi bi-${kycInfo.verificationStatus === 'WAITING' ? 'clock' : kycInfo.verificationStatus === 'REJECTED' ? 'x-circle' : 'info-circle'}-fill me-2`}></i>
        <div>
          <Alert.Heading className="mb-1" style={{ fontSize: '1rem' }}>
            Verificaci?n de Identidad Pendiente
          </Alert.Heading>
          <div style={{ fontSize: '0.875rem' }}>
            {getMessage()}
            <span className="ms-1">
              Necesitar?s completar el KYC para crear items y estados certificados.
            </span>
          </div>
        </div>
      </div>
      {retryError && (
        <Alert variant="danger" className="w-100 mb-2" style={{ fontSize: '0.875rem' }}>
          {retryError}
        </Alert>
      )}
      <Button
        variant={kycInfo.verificationStatus === 'REJECTED' ? 'danger' : 'outline-primary'}
        size="sm"
        onClick={handleOpenKyc}
        disabled={retrying}
      >
        {retrying ? (
          <>
            <Spinner size="sm" className="me-1" />
            Creando nueva firma...
          </>
        ) : (
          <>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Reintentar KYC
          </>
        )}
      </Button>
    </Alert>
  );
}
