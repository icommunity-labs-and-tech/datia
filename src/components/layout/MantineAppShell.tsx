'use client';

import {
  AppShell,
  Burger,
  Group,
  ActionIcon,
  Menu,
  Drawer,
  Anchor,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { useRouter } from 'next/navigation';
import { useTransition, useCallback } from 'react';
import {
  IconUser,
  IconLogout,
  IconLanguage,
  IconHome2,
  IconPackage,
  IconBolt,
  IconSettings,
  IconCode,
} from '@tabler/icons-react';
import { useAuthSeparated } from '@/hooks/useAuthSeparated';
import DatiaNavbar from './DatiaNavbar';
import Logo from '@/components/Logo';
import type { OrgModules } from '@/app/dashboard/(app)/layout';

const HEADER_HEIGHT = 56;
const NAV_BG = '#181c2e';
const NAV_BORDER = '#252a3d';

const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

interface MantineAppShellProps {
  children: React.ReactNode;
  logoUrl?: string | null;
  brandColorPrimary?: string | null;
  brandColorSecondary?: string | null;
  modules?: OrgModules;
}

export default function DatiaAppShell({
  children,
  logoUrl,
  brandColorPrimary,
  modules,
}: MantineAppShellProps) {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const tSidebar = useTranslations('sidebar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthSeparated();
  const [isPending, startTransition] = useTransition();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      document.cookie.split(';').forEach((c) => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
      window.location.replace('/auth/admin/login');
    }
  }, [logout]);

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return;
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
      setTimeout(() => window.location.reload(), 100);
    });
  };

  const primary = brandColorPrimary ?? '#1752CC';
  const showPassport = modules?.passport !== false;
  const showEnergy = modules?.energy === true;

  const isActive = (href: string, exact = false) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/');

  const mainLinks = [
    { href: '/dashboard', icon: IconHome2, label: tSidebar('home'), exact: true },
    ...(showPassport
      ? [{ href: '/dashboard/items', icon: IconPackage, label: tSidebar('assets'), exact: false }]
      : []),
    ...(showEnergy
      ? [{ href: '/dashboard/energy', icon: IconBolt, label: tSidebar('energy'), exact: false }]
      : []),
    { href: '/dashboard/settings', icon: IconSettings, label: tSidebar('settings'), exact: false },
    { href: '/dashboard/api', icon: IconCode, label: tSidebar('api'), exact: false },
  ];

  // Dashboard home gets full-height map with no padding
  const isDashboardHome = pathname === '/dashboard';

  return (
    <>
      <style>{`:root { --datia-primary: ${primary}; }`}</style>

      <AppShell header={{ height: HEADER_HEIGHT }} padding={0}>
        {/* ── Topbar ── */}
        <AppShell.Header style={{ background: NAV_BG, borderBottom: `1px solid ${NAV_BORDER}` }}>
          <Group h="100%" gap={0} wrap="nowrap">

            {/* Logo */}
            <Box
              px="md"
              style={{
                borderRight: `1px solid ${NAV_BORDER}`,
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                flexShrink: 0,
              }}
            >
              <Logo
                href="/dashboard"
                width={110}
                height={30}
                priority
                src={logoUrl ?? '/logo-datia-white.svg'}
                alt="datia"
              />
            </Box>

            {/* Desktop nav links */}
            <Group gap={0} visibleFrom="sm" style={{ flex: 1, height: '100%' }}>
              {mainLinks.map(({ href, icon: Icon, label, exact }) => {
                const active = isActive(href, exact);
                return (
                  <Anchor
                    key={href}
                    component={Link}
                    href={href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      height: HEADER_HEIGHT,
                      padding: '0 14px',
                      color: active ? '#ffffff' : '#8892a4',
                      borderBottom: `2px solid ${active ? '#F0930A' : 'transparent'}`,
                      textDecoration: 'none',
                      fontSize: 13.5,
                      fontWeight: active ? 600 : 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Icon size={15} stroke={1.5} />
                    {label}
                  </Anchor>
                );
              })}
            </Group>

            {/* Right actions */}
            <Group gap="xs" px="md" ml="auto" style={{ flexShrink: 0 }}>
              <Menu shadow="md" width={160}>
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    size="md"
                    aria-label="Switch language"
                    loading={isPending}
                    style={{ color: '#8892a4' }}
                  >
                    <IconLanguage size={18} stroke={1.5} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  {LANGUAGES.map((lang) => (
                    <Menu.Item
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      fw={lang.code === locale ? 600 : 400}
                    >
                      {lang.flag} {lang.label}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>

              <ActionIcon
                component={Link}
                href="/dashboard/settings?tab=org"
                variant="subtle"
                size="md"
                aria-label="Profile"
                style={{ color: '#8892a4' }}
              >
                <IconUser size={18} stroke={1.5} />
              </ActionIcon>

              <ActionIcon
                variant="subtle"
                size="md"
                aria-label="Log out"
                onClick={handleLogout}
                style={{ color: '#8892a4' }}
              >
                <IconLogout size={18} stroke={1.5} />
              </ActionIcon>

              <Burger
                opened={mobileOpened}
                onClick={toggleMobile}
                hiddenFrom="sm"
                size="sm"
                color="#8892a4"
                aria-label="Open menu"
              />
            </Group>
          </Group>
        </AppShell.Header>

        {/* Mobile nav drawer */}
        <Drawer
          opened={mobileOpened}
          onClose={closeMobile}
          size={240}
          padding={0}
          hiddenFrom="sm"
          zIndex={200}
        >
          <DatiaNavbar logoUrl={logoUrl} modules={modules} onNavClick={closeMobile} />
        </Drawer>

        {/* ── Main content ── */}
        <AppShell.Main>
          {isDashboardHome ? children : <Box p="md">{children}</Box>}
        </AppShell.Main>
      </AppShell>
    </>
  );
}
