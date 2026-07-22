'use client';

import { Badge, Card, SimpleGrid, Text, Title } from '@mantine/core';
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'datiaBlue';
      case 'USER': return 'cyan';
      default: return 'gray';
    }
  };

  return (
    <>
      {/* Información Personal */}
      <Box>
        <BoxTitle message={t('personalInfo')} />

        <SimpleGrid cols={{ base: 1, md: 2 }} mb="md">
          <Card>
            <Title order={6} mb="xs">{t('basicData')}</Title>
            <Text size="sm" mb={6}><strong>{t('name')}</strong> {user.name || t('notSpecified')}</Text>
            <Text size="sm" mb={6}><strong>{t('email')}</strong> {user.email}</Text>
            <Text size="sm"><strong>{t('phone')}</strong> {user.phone || t('notSpecified')}</Text>
          </Card>

          <Card>
            <Title order={6} mb="xs">{t('accountStatus')}</Title>
            <Text size="sm" component="div">
              <strong>{t('role')}</strong>{' '}
              <Badge color={getRoleBadgeColor(user.role)}>
                {user.role === 'ADMIN' ? t('roleAdmin') : t('roleUser')}
              </Badge>
            </Text>
          </Card>
        </SimpleGrid>

        {user.notes && (
          <Card mb="md">
            <Title order={6} mb="xs">{t('notes')}</Title>
            <Text size="sm">{user.notes}</Text>
          </Card>
        )}

        <Card mb="md">
          <Title order={6} mb="xs">{t('accountInfo')}</Title>
          <Text size="sm" mb={6}><strong>{t('created')}</strong> {formatValueWithSmartDateDetection(user.createdAt, 'createdAt')}</Text>
          <Text size="sm"><strong>{t('lastUpdated')}</strong> {formatValueWithSmartDateDetection(user.updatedAt, 'updatedAt')}</Text>
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
