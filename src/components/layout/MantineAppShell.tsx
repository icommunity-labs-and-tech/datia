'use client';

import { Menu, NavLink, Divider, Text, Stack } from '@mantine/core';
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
  IconExternalLink,
  IconUserCircle,
} from '@tabler/icons-react';
import { useAuthSeparated } from '@/hooks/useAuthSeparated';
import PanelShell from './PanelShell';
import SupportMessageModal from '@/components/support/SupportMessageModal';
import type { OrgModules } from '@/app/dashboard/(app)/layout';

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
  const showEnergy = modules?.energy === true;

  // Only content surfaces live in the top nav; account/organisation settings sit
  // under the avatar menu so the bar stays down to what the product actually does.
  // The energy views are separate routes, so each is its own nav entry. They
  // stay behind the module flag: an organisation without energy keeps a short bar.
  const mainLinks = [
    { href: '/dashboard', icon: IconHome2, label: tSidebar('home'), exact: true },
    ...(showPassport
      ? [{ href: '/dashboard/assets', icon: IconPackage, label: tSidebar('assets'), exact: false }]
      : []),
    ...(showEnergy
      ? [
          { href: '/dashboard/energy/consumption', icon: IconBolt, label: tEnergy('navConsumption'), exact: false },
          { href: '/dashboard/energy/emissions', icon: IconCloudFog, label: tEnergy('navEmissions'), exact: false },
        ]
      : []),
    { href: '/dashboard/api', icon: IconCode, label: tSidebar('api'), exact: false },
  ];

  // Dashboard home gets a full-height map with no padding
  const isDashboardHome = pathname === '/dashboard';

  return (
    <>
      <style>{`:root { --datia-primary: ${primary}; }`}</style>

      <PanelShell
        homeHref="/dashboard"
        logoSrc={logoUrl}
        navLinks={mainLinks}
        user={user}
        onLogout={handleLogout}
        fullBleed={isDashboardHome}
        accountMenuItems={
          <>
            <Menu.Item component={Link} href="/dashboard/settings" leftSection={<IconSettings size={16} stroke={1.6} />}>
              {tSidebar('settings')}
            </Menu.Item>
            <Menu.Item onClick={openSupport} leftSection={<IconLifebuoy size={16} stroke={1.6} />}>
              {tSupport('menuItem')}
            </Menu.Item>
          </>
        }
        mobileExtra={
          <>
            <NavLink
              component={Link}
              href="/dashboard/settings"
              label={tSidebar('settings')}
              leftSection={<IconSettings size={18} stroke={1.6} />}
              styles={(theme) => ({ root: { borderRadius: theme.radius.md } })}
            />
            <Divider my="xs" />
            <Text size="xs" fw={700} c="dimmed" px="sm" mb={4} tt="uppercase">
              {tSidebar('applications')}
            </Text>
            <Stack gap={2}>
              <NavLink
                component="a"
                href="/customer"
                target="_blank"
                rel="noopener noreferrer"
                label={tSidebar('appCustomer')}
                leftSection={<IconUserCircle size={18} stroke={1.6} />}
                rightSection={<IconExternalLink size={14} stroke={1.6} />}
                styles={(theme) => ({ root: { borderRadius: theme.radius.md } })}
              />
            </Stack>
          </>
        }
      >
        {children}
      </PanelShell>

      <SupportMessageModal opened={supportOpened} onClose={closeSupport} />
    </>
  );
}
