'use client';

import { useState, useEffect } from 'react';
import { Alert } from 'react-bootstrap';
import { getOrganizationKyc } from '@/actions/organizations/get-organization-kyc';

export default function KycInfoBanner() {
  const [kycInfo, setKycInfo] = useState<{
    verificationStatus: 'NOT_VERIFIED' | 'WAITING' | 'VERIFIED' | 'REJECTED';
    organizationName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Only show banner if KYC is not verified
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
        return 'La verificación de identidad (KYC) está pendiente de aprobación. Podrás crear estados certificados una vez aprobada.';
      case 'REJECTED':
        return 'La verificación de identidad (KYC) fue rechazada. Contacta con soporte para más información.';
      case 'NOT_VERIFIED':
      default:
        return 'La verificación de identidad (KYC) no ha sido completada. Completa el proceso para crear estados certificados.';
    }
  };

  const getIcon = () => {
    switch (kycInfo.verificationStatus) {
      case 'WAITING':
        return 'clock';
      case 'REJECTED':
        return 'x-circle';
      default:
        return 'info-circle';
    }
  };

  return (
    <Alert variant={getVariant()} className="mb-3 d-flex align-items-center">
      <i className={`bi bi-${getIcon()}-fill me-2`}></i>
      <span style={{ fontSize: '0.875rem' }}>{getMessage()}</span>
    </Alert>
  );
}
