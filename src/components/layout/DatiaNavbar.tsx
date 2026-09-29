'use client';

import {
  NavLink,
  Stack,
  Text,
  Divider,
  ScrollArea,
  Box,
} from '@mantine/core';
import {
  IconHome2,
  IconPackage,
  IconBolt,
  IconCloudFog,
  IconSettings,
  IconCode,
  IconExternalLink,
  IconUserCircle,
} from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Logo from '@/components/Logo';
import type { OrgModules } from '@/app/dashboard/(app)/layout';

interface DatiaNavbarProps {
  logoUrl?: string | null;
  modules?: OrgModules;
  onNavClick?: () => void;
}

export default function DatiaNavbar({ logoUrl, modules, onNavClick }: DatiaNavbarProps) {
  const pathname = usePathname();
  const t = useTranslations('sidebar');
  const tEnergy = useTranslations('energyHub');

  const showPassport = modules?.passport !== false;
  const showEnergy = modules?.energy === true;

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const mainLinks = [
    { href: '/dashboard', icon: IconHome2, label: t('home'), exact: true },
    ...(showPassport ? [{ href: '/dashboard/assets', icon: IconPackage, label: t('assets') }] : []),
    ...(showEnergy
      ? [
          { href: '/dashboard/energy/consumption', icon: IconBolt, label: tEnergy('navConsumption') },
          { href: '/dashboard/energy/emissions', icon: IconCloudFog, label: tEnergy('navEmissions') },
        ]
      : []),
    { href: '/dashboard/api', icon: IconCode, label: t('api') },
    // On mobile there is no avatar menu, so organisation settings live here.
    { href: '/dashboard/settings', icon: IconSettings, label: t('settings') },
  ];

  return (
    <Stack gap={0} h="100%">
      {/* Logo */}
      <Box p="md" pb="sm">
        <Logo
          href="/dashboard"
          width={104}
          height={32}
          priority
          src={logoUrl ?? '/logo-datia.svg'}
          alt="datia"
        />
      </Box>

      <Divider />

      {/* Main navigation */}
      <ScrollArea flex={1} px="xs" py="xs">
        <Stack gap={2}>
          {mainLinks.map(({ href, icon: Icon, label, exact }) => (
            <NavLink
              key={href}
              component={Link}
              href={href}
              label={label}
              leftSection={<Icon size={18} stroke={1.6} />}
              active={isActive(href, exact)}
              onClick={onNavClick}
              styles={(theme) => ({
                root: {
                  borderRadius: theme.radius.md,
                  fontWeight: isActive(href, exact) ? 600 : 450,
                },
              })}
            />
          ))}
        </Stack>

        {/* Applications */}
        <Divider my="xs" />
        <Text size="xs" fw={700} c="dimmed" px="sm" mb={4} tt="uppercase">
          {t('applications')}
        </Text>
        <NavLink
          component="a"
          href="/customer"
          target="_blank"
          rel="noopener noreferrer"
          label={t('appCustomer')}
          leftSection={<IconUserCircle size={18} stroke={1.6} />}
          rightSection={<IconExternalLink size={14} stroke={1.6} />}
          styles={(theme) => ({ root: { borderRadius: theme.radius.md } })}
        />
      </ScrollArea>
    </Stack>
  );
}
