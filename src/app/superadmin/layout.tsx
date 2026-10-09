'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { IconHome2, IconBuildingSkyscraper, IconHeadset } from '@tabler/icons-react';
import PanelShell from '@/components/layout/PanelShell';

// The platform account's own panel. The organization account used to share
// this same layout, filtered to its own half by role — moved out to
// /organization, with its own login and branding: an ORG_ADMIN is a real
// customer, not platform staff, and "Panel de plataforma" /
// "Acceso restringido" said otherwise on every screen it saw.
//
// Chrome (topbar, account menu, language switcher, mobile drawer) comes from
// PanelShell, the same shell the dashboard an organization's companies see
// uses — before this, the three panels were three different hand-rolled
// headers, so a customer moving between its dashboard and this one saw three
// different products.

interface SessionUser {
  id: string;
  name?: string;
  email: string;
  role: string;
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('superadminPanel');
  const tSidebar = useTranslations('sidebar');
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/superadmin/session');
      const data = await response.json();

      if (data.user) {
        setUser(data.user);
        return;
      }

      // No platform session. Before sending it to this panel's own login,
      // check whether it is an organization session instead — a valid
      // session, just the wrong panel, which gets sent to its own rather
      // than told it is signed out.
      const orgResponse = await fetch('/api/auth/organization/session');
      const orgData = await orgResponse.json();
      if (orgData.user) {
        router.replace('/organization/companies');
      } else {
        router.push('/auth/superadmin/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/auth/superadmin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/superadmin/logout', { method: 'POST' });
      router.push('/auth/superadmin/login');
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
    { href: '/superadmin', icon: IconHome2, label: tSidebar('home'), exact: true },
    { href: '/superadmin/organizations', icon: IconBuildingSkyscraper, label: t('nav.organizations') },
    { href: '/superadmin/support-messages', icon: IconHeadset, label: t('nav.support') },
  ];

  return (
    <PanelShell homeHref="/superadmin" navLinks={navLinks} user={user} onLogout={handleLogout}>
      {user ? children : null}
    </PanelShell>
  );
}
