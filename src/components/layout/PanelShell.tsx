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
  NavLink,
  Stack,
  Divider,
  ScrollArea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { useRouter } from 'next/navigation';
import { useTransition, type ComponentType } from 'react';
import { IconLogout, IconLanguage, IconChevronDown } from '@tabler/icons-react';
import NotificationBell from './NotificationBell';
import Logo from '@/components/Logo';

const HEADER_HEIGHT = 60;
const HAIRLINE = 'var(--mantine-color-gray-2)';
const APP_BG = 'var(--mantine-color-gray-0)';
const MUTED = 'var(--mantine-color-gray-6)';

const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export interface PanelNavLink {
  href: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  label: string;
  exact?: boolean;
}

interface PanelShellProps {
  children: React.ReactNode;
  homeHref: string;
  logoSrc?: string | null;
  logoAlt?: string;
  navLinks: PanelNavLink[];
  user: { name?: string | null; email?: string | null } | null;
  /** Rendered next to the logo — e.g. the organization's name. */
  subtitle?: React.ReactNode;
  /** Extra Menu.Item(s) in the account dropdown, above the logout divider. */
  accountMenuItems?: React.ReactNode;
  onLogout: () => void | Promise<void>;
  showNotificationBell?: boolean;
  /** The one screen that gets a full-height, unpadded canvas (e.g. a map). */
  fullBleed?: boolean;
  /** Extra section appended under the nav list in the mobile drawer. */
  mobileExtra?: React.ReactNode;
}

/**
 * The one shell behind every authenticated panel — dashboard, superadmin and
 * organization used to each hand-roll their own header, so a customer moving
 * between its own dashboard and the organization panel saw three different
 * products. Nav links, branding and account-menu extras are the only things
 * that vary per panel; everything else (topbar layout, account menu pattern,
 * language switcher, notifications, mobile drawer) is shared.
 */
export default function PanelShell({
  children,
  homeHref,
  logoSrc,
  logoAlt = 'datia',
  navLinks,
  user,
  subtitle,
  accountMenuItems,
  onLogout,
  showNotificationBell = true,
  fullBleed = false,
  mobileExtra,
}: PanelShellProps) {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const tSidebar = useTranslations('sidebar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return;
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
      setTimeout(() => window.location.reload(), 100);
    });
  };

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const initials = (user?.name || user?.email || 'D').trim().charAt(0).toUpperCase();

  return (
    <AppShell header={{ height: HEADER_HEIGHT }} padding={0}>
      {/* ── Topbar ── */}
      <AppShell.Header
        style={{ background: 'var(--mantine-color-white)', borderBottom: `1px solid ${HAIRLINE}` }}
      >
        <Group h="100%" gap={0} wrap="nowrap" px="md">
          {/* Logo */}
          <Box pr="lg" style={{ display: 'flex', alignItems: 'center', height: '100%', flexShrink: 0 }}>
            <Logo href={homeHref} width={104} height={28} priority src={logoSrc ?? '/logo-datia.svg'} alt={logoAlt} />
          </Box>

          {subtitle && (
            <Box pr="lg" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {subtitle}
            </Box>
          )}

          {/* Desktop nav links */}
          <Group gap={4} visibleFrom="sm" style={{ flex: 1, height: '100%' }}>
            {navLinks.map(({ href, icon: Icon, label, exact }) => {
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
            {showNotificationBell && <NotificationBell />}

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
                {accountMenuItems}
                <Menu.Divider />
                <Menu.Item color="red" onClick={onLogout} leftSection={<IconLogout size={16} stroke={1.6} />}>
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
      <Drawer opened={mobileOpened} onClose={closeMobile} size={260} padding={0} hiddenFrom="sm" zIndex={200}>
        <Stack gap={0} h="100%">
          <Box p="md" pb="sm">
            <Logo href={homeHref} width={104} height={32} priority src={logoSrc ?? '/logo-datia.svg'} alt={logoAlt} />
          </Box>
          <Divider />
          <ScrollArea flex={1} px="xs" py="xs">
            <Stack gap={2}>
              {navLinks.map(({ href, icon: Icon, label, exact }) => (
                <NavLink
                  key={href}
                  component={Link}
                  href={href}
                  label={label}
                  leftSection={<Icon size={18} stroke={1.6} />}
                  active={isActive(href, exact)}
                  onClick={closeMobile}
                  styles={(theme) => ({
                    root: { borderRadius: theme.radius.md, fontWeight: isActive(href, exact) ? 600 : 450 },
                  })}
                />
              ))}
            </Stack>
            {mobileExtra}
          </ScrollArea>
        </Stack>
      </Drawer>

      {/* ── Main content ── */}
      <AppShell.Main style={{ background: APP_BG }}>
        {fullBleed ? children : (
          <Box px={{ base: 'md', sm: 'xl' }} py="lg" mx="auto" maw={1360}>
            {children}
          </Box>
        )}
      </AppShell.Main>
    </AppShell>
  );
}
