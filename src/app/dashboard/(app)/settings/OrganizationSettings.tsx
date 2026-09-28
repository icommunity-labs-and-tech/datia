'use client';

import { useState } from 'react';
import {
  Badge,
  Card,
  Grid,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Avatar,
} from '@mantine/core';
import { IconBuilding, IconShieldCheck, IconPalette, IconUser, IconLock } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import PageHeader from '@/components/layout/PageHeader';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import OrgKycCard from '@/app/dashboard/profile/OrgKycCard';
import OrgLogoCard from '@/app/dashboard/profile/OrgLogoCard';
import OrgColorsCard from '@/app/dashboard/profile/OrgColorsCard';
import OrgLoginUrlsCard from '@/app/dashboard/profile/OrgLoginUrlsCard';
import { isDashboardRole } from '@/lib/auth/roles';

interface SectionProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, description, children }: SectionProps) {
  return (
    <Stack gap="xs">
      <Group gap="sm" align="flex-start" wrap="nowrap">
        <ThemeIcon variant="light" color="datiaBlue" size={28} radius="sm" style={{ flexShrink: 0 }}>
          <Icon size={16} stroke={1.7} />
        </ThemeIcon>
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Title order={4}>{title}</Title>
          {description && <Text size="xs" c="dimmed">{description}</Text>}
        </Stack>
      </Group>
      {children}
    </Stack>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="md">
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="sm" fw={550} ta="right" style={{ minWidth: 0 }} truncate>
        {value}
      </Text>
    </Group>
  );
}

export default function OrganizationSettings({ user }: { user: any }) {
  const t = useTranslations('settings');
  const tProfile = useTranslations('profile');
  const org = user?.Organization ?? null;
  // El KYC es de la empresa, no de la organización (#23).
  const company = user?.Company ?? null;
  const [logoUrl, setLogoUrl] = useState<string | null>(org?.logoUrl ?? null);

  const isAdmin = isDashboardRole(user?.role);
  const orgInitial = (org?.name ?? 'O').trim().charAt(0).toUpperCase();

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />

      <Grid gutter="xl">
        {/* ── Organisation ── */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="xl">
            <Section icon={IconBuilding} title={t('organization')} description={t('organizationHint')}>
              <Card p="lg">
                <Group gap="md" mb="md" wrap="nowrap">
                  <Avatar size={44} radius="md" color="datiaBlue" variant="light">
                    <Text fw={700} fz="lg">{orgInitial}</Text>
                  </Avatar>
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text fw={600} truncate>{org?.name ?? '—'}</Text>
                    {org?.slug && <Text size="xs" c="dimmed" ff="monospace">/{org.slug}</Text>}
                  </Stack>
                </Group>
                <Stack gap={8}>
                  <Field
                    label={tProfile('kyc.status').replace(':', '')}
                    value={
                      <Badge
                        variant="light"
                        color={company?.verificationStatus === 'VERIFIED' ? 'green' : 'yellow'}
                      >
                        {company?.verificationStatus === 'VERIFIED'
                          ? tProfile('kyc.verified')
                          : tProfile('kyc.notVerified')}
                      </Badge>
                    }
                  />
                  {company?.signatureID && (
                    <Field label={t('signatureId')} value={<Text size="xs" ff="monospace">{company.signatureID}</Text>} />
                  )}
                </Stack>
              </Card>
            </Section>

            {isAdmin && org && (
              <Section icon={IconPalette} title={tProfile('branding.title')} description={tProfile('branding.description')}>
                <Stack gap={0}>
                  <OrgLogoCard logoUrl={logoUrl} onLogoChange={setLogoUrl} />
                  <OrgColorsCard
                    logoUrl={logoUrl}
                    orgName={org.name}
                    initialColorPrimary={org.brandColorPrimary || '#0f172a'}
                    initialColorSecondary={org.brandColorSecondary || ''}
                  />
                  {org.slug && <OrgLoginUrlsCard slug={org.slug} />}
                </Stack>
              </Section>
            )}
          </Stack>
        </Grid.Col>

        {/* ── Account ── */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="xl">
            <Section icon={IconUser} title={t('account')}>
              <Card p="lg">
                <Stack gap={8}>
                  <Field label={tProfile('name').replace(':', '')} value={user?.name || tProfile('notSpecified')} />
                  <Field label={tProfile('email').replace(':', '')} value={user?.email ?? '—'} />
                  <Field
                    label={tProfile('role').replace(':', '')}
                    value={
                      <Badge variant="light" color={isAdmin ? 'datiaBlue' : 'cyan'}>
                        {isAdmin ? tProfile('roleAdmin') : tProfile('roleUser')}
                      </Badge>
                    }
                  />
                </Stack>
              </Card>
            </Section>

            {/* A verified company already shows its status above — the KYC
                panel only earns its space while something is pending. */}
            {company && company.verificationStatus !== 'VERIFIED' && (
              <Section icon={IconShieldCheck} title={tProfile('kyc.title')}>
                <OrgKycCard company={company} />
              </Section>
            )}

            <Section icon={IconLock} title={tProfile('changePassword')} description={tProfile('changePasswordDescription')}>
              <Card p="lg">
                <ChangePasswordForm />
              </Card>
            </Section>
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}
