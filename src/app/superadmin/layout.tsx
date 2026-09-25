'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button, Center, Group, Loader, Stack, Text } from '@mantine/core';
import Link from 'next/link';

// The platform account and the organization account share this panel and see
// different halves of it: the first manages organizations, the second the
// companies of its own (#20).
const PLATFORM_LINKS = [
  { href: '/superadmin', icon: 'bi-house', label: 'Inicio' },
  { href: '/superadmin/organizations', icon: 'bi-building', label: 'Organizaciones' },
  { href: '/superadmin/support-messages', icon: 'bi-chat-dots', label: 'Soporte' },
];
const ORGANIZATION_LINKS = [
  { href: '/superadmin/companies', icon: 'bi-buildings', label: 'Empresas' },
];
const ORGANIZATION_HOME = '/superadmin/companies';

const isCompaniesPath = (path: string) => path === ORGANIZATION_HOME || path.startsWith(ORGANIZATION_HOME + '/');

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/superadmin/session');
      const data = await response.json();

      if (!data.user) {
        router.push('/auth/superadmin/login');
      } else {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/auth/superadmin/login');
    } finally {
      setLoading(false);
    }
  };

  const isOrganization = user?.role === 'ORG_ADMIN';
  const navLinks = isOrganization ? ORGANIZATION_LINKS : PLATFORM_LINKS;

  // Each account only reaches its own half. The pages and actions refuse the
  // other one too; this keeps a wrong URL from showing a screen that cannot work.
  const home = isOrganization ? ORGANIZATION_HOME : '/superadmin';
  const allowed = !user || (isOrganization === isCompaniesPath(pathname));

  useEffect(() => {
    if (user && !allowed) router.replace(home);
  }, [user, allowed, home, router]);

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
          <Loader color="red" />
          <Text size="sm" c="dimmed">Verificando acceso...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Top nav */}
      <header style={{ padding: '12px 24px' }}>
        <Group justify="space-between" wrap="wrap">
          <Group gap={12}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="bi bi-shield-lock-fill" style={{ fontSize: '1.25rem', color: '#dc2626' }} />
            </div>
            <Text fw={600} fz="lg" c="#1f2937">Datia</Text>
            {isOrganization && user?.organizationName && (
              <Text size="sm" c="dimmed">{user.organizationName}</Text>
            )}
          </Group>

          <Group gap={4}>
            {navLinks.map(({ href, icon, label }) => {
              const active = pathname === href || (href !== '/superadmin' && pathname.startsWith(href + '/'));
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#dc2626' : 'var(--mantine-color-dimmed)',
                    background: active ? '#fef2f2' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <i className={`bi ${icon}`} />
                  {label}
                </Link>
              );
            })}

            <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.15)', margin: '0 12px' }} />

            <Group gap={8} style={{ padding: '6px 12px' }}>
              <i className="bi bi-person-circle" style={{ fontSize: '1.25rem', color: 'var(--mantine-color-dimmed)' }} />
              <Text size="sm" c="dimmed">{user?.name || user?.email}</Text>
            </Group>

            <Button
              variant="default"
              size="xs"
              onClick={handleLogout}
              leftSection={<i className="bi bi-box-arrow-right" />}
            >
              Salir
            </Button>
          </Group>
        </Group>
      </header>

      {/* Main content */}
      <main style={{ flexGrow: 1, padding: '48px 24px' }}>
        {allowed ? children : null}
      </main>

      {/* Footer */}
      <footer
        style={{
          marginTop: 'auto',
          background: 'white',
          borderTop: '1px solid var(--mantine-color-default-border)',
          padding: '1.5rem 0',
          textAlign: 'center',
        }}
      >
        <Group justify="center" gap={8} mb={6}>
          <i className="bi bi-shield-check" style={{ color: '#dc2626' }} />
          <Text size="sm" c="dimmed" fw={500}>
            {isOrganization ? 'Panel de organización - Datia' : 'Panel de Super Administrador - Datia'}
          </Text>
        </Group>
        <Text size="xs" c="dimmed">Acceso Restringido • Solo personal autorizado</Text>
      </footer>
    </div>
  );
}
