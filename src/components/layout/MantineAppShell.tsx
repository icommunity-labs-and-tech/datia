'use client';

import { Menu, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { useCallback } from 'react';
import {
  IconHome2,
  IconPackage,
  IconBolt,
  IconCloudFog,
  IconSettings,
  IconCode,
  IconLifebuoy,
} from '@tabler/icons-react';
import { useAuthSeparated } from '@/hooks/useAuthSeparated';
import PanelShell from './PanelShell';
import SupportMessageModal from '@/components/support/SupportMessageModal';
import type { OrgModules } from '@/app/company/(app)/layout';

interface MantineAppShellProps {
  children: React.ReactNode;
  logoUrl?: string | null;
  brandColorPrimary?: string | null;
  brandColorSecondary?: string | null;
  modules?: OrgModules;
}

export default function DatiaAppShell({ children, logoUrl, brandColorPrimary, modules }: MantineAppShellProps) {
  const tSidebar = useTranslations('sidebar');
  const tSupport = useTranslations('support');
  const [supportOpened, { open: openSupport, close: closeSupport }] = useDisclosure(false);
  const tEnergy = useTranslations('energyHub');
  const pathname = usePathname();
  const { user, logout } = useAuthSeparated();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      document.cookie.split(';').forEach((c) => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
      window.location.replace('/auth/company/login');
    }
  }, [logout]);

  const primary = brandColorPrimary ?? '#1752CC';
  const showPassport = modules?.passport !== false;

  // Only content surfaces live in the top nav; account/organisation settings sit
  // under the avatar menu so the bar stays down to what the product actually does.
  // Consumption and emissions are part of every company's panel, data or not.
  const mainLinks = [
    { href: '/company', icon: IconHome2, label: tSidebar('home'), exact: true },
    ...(showPassport
      ? [{ href: '/company/assets', icon: IconPackage, label: tSidebar('assets'), exact: false }]
      : []),
    { href: '/company/energy/consumption', icon: IconBolt, label: tEnergy('navConsumption'), exact: false },
    { href: '/company/energy/emissions', icon: IconCloudFog, label: tEnergy('navEmissions'), exact: false },
    { href: '/company/api', icon: IconCode, label: tSidebar('api'), exact: false },
  ];

  // Dashboard home gets a full-height map with no padding
  const isDashboardHome = pathname === '/company';

  return (
    <>
      <style>{`:root { --datia-primary: ${primary}; }`}</style>

      <PanelShell
        homeHref="/company"
        logoSrc={logoUrl}
        navLinks={mainLinks}
        user={user}
        onLogout={handleLogout}
        fullBleed={isDashboardHome}
        accent="datiaGreen"
        accountMenuItems={
          <>
            <Menu.Item component={Link} href="/company/settings" leftSection={<IconSettings size={16} stroke={1.6} />}>
              {tSidebar('settings')}
            </Menu.Item>
            <Menu.Item onClick={openSupport} leftSection={<IconLifebuoy size={16} stroke={1.6} />}>
              {tSupport('menuItem')}
            </Menu.Item>
          </>
        }
        mobileExtra={
          <NavLink
            component={Link}
            href="/company/settings"
            label={tSidebar('settings')}
            leftSection={<IconSettings size={18} stroke={1.6} />}
            styles={(theme) => ({ root: { borderRadius: theme.radius.md } })}
          />
        }
      >
        {children}
      </PanelShell>

      <SupportMessageModal opened={supportOpened} onClose={closeSupport} />
    </>
  );
}
