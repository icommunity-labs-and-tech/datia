'use client';

import { Badge, Row, Col, Card } from 'react-bootstrap';
import Box from '@/components/Box';
import BoxTitle from '@/components/BoxTitle';
import { formatValueWithSmartDateDetection } from '@/lib/format';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import OrgKycCard from './OrgKycCard';
import OrgLogoCard from './OrgLogoCard';
import OrgColorsCard from './OrgColorsCard';
import OrgLoginUrlsCard from './OrgLoginUrlsCard';

export default function ProfilePageClient({ user }: { user: any }) {
  const t = useTranslations('profile');
  const [logoUrl, setLogoUrl] = useState<string | null>(user?.Organization?.logoUrl || null);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'primary';
      case 'USER': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <>
      {/* Información Personal */}
      <Box>
        <BoxTitle message={t('personalInfo')} />

        <Row>
          <Col md={6}>
            <Card className="mb-3">
              <Card.Body>
                <h6 className="card-title">{t('basicData')}</h6>
                <div className="mb-2"><strong>{t('name')}</strong> {user.name || t('notSpecified')}</div>
                <div className="mb-2"><strong>{t('email')}</strong> {user.email}</div>
                <div className="mb-2"><strong>{t('phone')}</strong> {user.phone || t('notSpecified')}</div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="mb-3">
              <Card.Body>
                <h6 className="card-title">{t('accountStatus')}</h6>
                <div className="mb-2">
                  <strong>{t('role')}</strong>{' '}
                  <Badge bg={getRoleBadgeVariant(user.role)}>
                    {user.role === 'ADMIN' ? t('roleAdmin') : t('roleUser')}
                  </Badge>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {user.notes && (
          <Card className="mb-3">
            <Card.Body>
              <h6 className="card-title">{t('notes')}</h6>
              <p className="card-text">{user.notes}</p>
            </Card.Body>
          </Card>
        )}

        <Card className="mb-3">
          <Card.Body>
            <h6 className="card-title">{t('accountInfo')}</h6>
            <div className="mb-2"><strong>{t('created')}</strong> {formatValueWithSmartDateDetection(user.createdAt, 'createdAt')}</div>
            <div className="mb-2"><strong>{t('lastUpdated')}</strong> {formatValueWithSmartDateDetection(user.updatedAt, 'updatedAt')}</div>
          </Card.Body>
        </Card>
      </Box>

      {/* Verificación de Identidad (KYC) */}
      {user?.Organization && (
        <Box>
          <BoxTitle message={t('kyc.title')} />
          <OrgKycCard organization={user.Organization} />
        </Box>
      )}

      {/* Identidad visual — solo para ADMIN */}
      {user.role === 'ADMIN' && user?.Organization && (
        <Box>
          <BoxTitle message={t('branding.title')} />
          <p className="text-muted">{t('branding.description')}</p>

          <OrgLogoCard logoUrl={logoUrl} onLogoChange={setLogoUrl} />

          <OrgColorsCard
            logoUrl={logoUrl}
            orgName={user.Organization.nombre}
            initialColorPrimary={user.Organization.brandColorPrimary || '#0f172a'}
            initialColorSecondary={user.Organization.brandColorSecondary || ''}
          />

          {user.Organization.slug && (
            <OrgLoginUrlsCard slug={user.Organization.slug} />
          )}
        </Box>
      )}

      {/* Cambio de Contraseña */}
      <Box>
        <BoxTitle message={t('changePassword')} />
        <p>{t('changePasswordDescription')}</p>
        <ChangePasswordForm />
      </Box>
    </>
  );
}
