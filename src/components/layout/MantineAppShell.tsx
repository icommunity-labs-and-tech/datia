'use client';

import {
  AppShell,
  Burger,
  Group,
  ActionIcon,
  Menu,
  Drawer,
  Anchor,
  Avatar,
  Box,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { useRouter } from 'next/navigation';
import { useTransition, useCallback } from 'react';
import {
  IconLogout,
  IconLanguage,
  IconHome2,
  IconPackage,
  IconBolt,
  IconCloudFog,
  IconSettings,
  IconCode,
  IconChevronDown,
} from '@tabler/icons-react';
import { useAuthSeparated } from '@/hooks/useAuthSeparated';
import DatiaNavbar from './DatiaNavbar';
import Logo from '@/components/Logo';
import type { OrgModules } from '@/app/dashboard/(app)/layout';

const HEADER_HEIGHT = 60;
const HAIRLINE = 'var(--mantine-color-gray-2)';
const APP_BG = 'var(--mantine-color-gray-0)';
const MUTED = 'var(--mantine-color-gray-6)';

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
  const tEnergy = useTranslations('energyHub');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthSeparated();
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

  // Only content surfaces live in the top nav; account/organisation settings sit
  // under the avatar menu so the bar stays down to what the product actually does.
  // The energy views are separate routes, so each is its own nav entry. They
  // stay behind the module flag: an organisation without energy keeps a short bar.
  const mainLinks = [
    { href: '/dashboard', icon: IconHome2, label: tSidebar('home'), exact: true },
    ...(showPassport
      ? [{ href: '/dashboard/items', icon: IconPackage, label: tSidebar('assets'), exact: false }]
      : []),
    ...(showEnergy
      ? [
          { href: '/dashboard/energy/consumption', icon: IconBolt, label: tEnergy('navConsumption'), exact: false },
          { href: '/dashboard/energy/emissions', icon: IconCloudFog, label: tEnergy('navEmissions'), exact: false },
        ]
      : []),
    { href: '/dashboard/api', icon: IconCode, label: tSidebar('api'), exact: false },
  ];

  const initials = (user?.name || user?.email || 'D').trim().charAt(0).toUpperCase();

  // Dashboard home gets a full-height map with no padding
  const isDashboardHome = pathname === '/dashboard';

  return (
    <>
      <style>{`:root { --datia-primary: ${primary}; }`}</style>

      <AppShell header={{ height: HEADER_HEIGHT }} padding={0}>
        {/* ── Topbar ── */}
        <AppShell.Header
          style={{ background: 'var(--mantine-color-white)', borderBottom: `1px solid ${HAIRLINE}` }}
        >
          <Group h="100%" gap={0} wrap="nowrap" px="md">

            {/* Logo */}
            <Box
              pr="lg"
              style={{ display: 'flex', alignItems: 'center', height: '100%', flexShrink: 0 }}
            >
              <Logo
                href="/dashboard"
                width={104}
                height={28}
                priority
                src={logoUrl ?? '/logo-datia.svg'}
                alt="datia"
              />
            </Box>

            {/* Desktop nav links */}
            <Group gap={4} visibleFrom="sm" style={{ flex: 1, height: '100%' }}>
              {mainLinks.map(({ href, icon: Icon, label, exact }) => {
                const active = isActive(href, exact);
                return (
                  <Anchor
                    key={href}
                    component={Link}
                    href={href}
                    data-active={active || undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      height: 36,
                      padding: '0 12px',
                      borderRadius: 8,
                      color: active ? 'var(--mantine-color-datiaBlue-7)' : MUTED,
                      background: active ? 'var(--mantine-color-datiaBlue-0)' : 'transparent',
                      textDecoration: 'none',
                      fontSize: 13.5,
                      fontWeight: active ? 600 : 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Icon size={16} stroke={1.7} />
                    {label}
                  </Anchor>
                );
              })}
            </Group>

            {/* Right actions */}
            <Group gap={6} ml="auto" style={{ flexShrink: 0 }}>
              <Menu shadow="lg" width={168} position="bottom-end">
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="lg"
                    radius="md"
                    aria-label={tSidebar('language')}
                    loading={isPending}
                  >
                    <IconLanguage size={19} stroke={1.6} />
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

              <Menu shadow="lg" width={230} position="bottom-end">
                <Menu.Target>
                  <Group
                    gap={7}
                    px={6}
                    py={4}
                    wrap="nowrap"
                    component="button"
                    aria-label={tSidebar('account')}
                    style={{
                      border: `1px solid ${HAIRLINE}`,
                      borderRadius: 999,
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <Avatar size={26} radius="xl" color="datiaBlue" variant="filled">
                      <Text fz={12} fw={700}>{initials}</Text>
                    </Avatar>
                    <IconChevronDown size={14} stroke={2} color="var(--mantine-color-gray-5)" />
                  </Group>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>
                    <Text size="xs" fw={600} c="dark" truncate>
                      {user?.name || user?.email || '—'}
                    </Text>
                  </Menu.Label>
                  <Menu.Item
                    component={Link}
                    href="/dashboard/settings"
                    leftSection={<IconSettings size={16} stroke={1.6} />}
                  >
                    {tSidebar('settings')}
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    onClick={handleLogout}
                    leftSection={<IconLogout size={16} stroke={1.6} />}
                  >
                    {tSidebar('logout')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>

              <Burger
                opened={mobileOpened}
                onClick={toggleMobile}
                hiddenFrom="sm"
                size="sm"
                aria-label={tSidebar('openMenu')}
              />
            </Group>
          </Group>
        </AppShell.Header>

        {/* Mobile nav drawer */}
        <Drawer
          opened={mobileOpened}
          onClose={closeMobile}
          size={260}
          padding={0}
          hiddenFrom="sm"
          zIndex={200}
        >
          <DatiaNavbar logoUrl={logoUrl} modules={modules} onNavClick={closeMobile} />
        </Drawer>

        {/* ── Main content ── */}
        <AppShell.Main style={{ background: APP_BG }}>
          {isDashboardHome ? (
            children
          ) : (
            <Box px={{ base: 'md', sm: 'xl' }} py="lg" mx="auto" maw={1360}>
              {children}
            </Box>
          )}
        </AppShell.Main>
      </AppShell>
    </>
  );
}
