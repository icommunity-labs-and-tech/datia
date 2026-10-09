'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Center, Loader, Menu, Stack, Text } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { IconBolt, IconBuilding, IconCloudFog, IconHome2, IconSettings } from '@tabler/icons-react';
import PanelShell from '@/components/layout/PanelShell';
import { isOrganizationEnergyEnabled } from '@/actions/organizations/get-trend';

// The organization account's own panel (#20) — split out of /superadmin,
// which it used to share filtered to its own half by role. An ORG_ADMIN is a
// real customer managing its own companies, not platform staff, and sharing
// that panel's branding ("Panel de plataforma", "Acceso
// restringido") told it otherwise on every screen.
//
// Chrome (topbar, account menu, language switcher, mobile drawer) comes from
// PanelShell, the same shell a company's own dashboard uses.
const NAV_HOME = '/organization/companies';

interface SessionUser {
  id: string;
  name?: string;
  email: string;
  role: string;
}

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('organizationPanel');
  const tSidebar = useTranslations('sidebar');
  const tEnergy = useTranslations('energyHub');
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [energyEnabled, setEnergyEnabled] = useState(false);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/organization/session');
      const data = await response.json();

      if (!data.user || data.user.role !== 'ORG_ADMIN') {
        // No session, or a platform one: this panel is the organization's.
        router.push('/auth/organization/login');
      } else {
        setUser(data.user);
        // Mirrors the company dashboard's own topbar: the energy links only
        // show once the organization has switched the module on.
        isOrganizationEnergyEnabled().then(setEnergyEnabled).catch(() => setEnergyEnabled(false));
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/auth/organization/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/organization/logout', { method: 'POST' });
      router.push('/auth/organization/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Stack align="center" gap="xs">
          <Loader />
          <Text size="sm" c="dimmed">{tSidebar('checkingAccess')}</Text>
        </Stack>
      </Center>
    );
  }

  const navLinks = [
    { href: '/organization', icon: IconHome2, label: tSidebar('home'), exact: true },
    { href: NAV_HOME, icon: IconBuilding, label: t('nav.companies') },
    ...(energyEnabled
      ? [
          { href: '/organization/consumption', icon: IconBolt, label: tEnergy('navConsumption'), exact: false },
          { href: '/organization/emissions', icon: IconCloudFog, label: tEnergy('navEmissions'), exact: false },
        ]
      : []),
  ];

  const accountMenuItems = (
    <Menu.Item component={Link} href="/organization/settings" leftSection={<IconSettings size={16} stroke={1.6} />}>
      {tSidebar('settings')}
    </Menu.Item>
  );

  return (
    <PanelShell
      homeHref={NAV_HOME}
      navLinks={navLinks}
      user={user}
      onLogout={handleLogout}
      accountMenuItems={accountMenuItems}
    >
      {user ? children : null}
    </PanelShell>
  );
}
