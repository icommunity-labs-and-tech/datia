'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button, Center, Group, Loader, Stack, Text } from '@mantine/core';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

// The organization account's own panel (#20) — split out of /superadmin,
// which it used to share filtered to its own half by role. An ORG_ADMIN is a
// real customer managing its own companies, not platform staff, and sharing
// that panel's branding ("Panel de Super Administrador", "Acceso
// restringido") told it otherwise on every screen.
const NAV_HOME = '/organization/companies';

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('organizationPanel');
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

      if (!data.user || data.user.role !== 'ORG_ADMIN') {
        // No session, or a platform one: this panel is the organization's.
        router.push('/auth/organization/login');
      } else {
        setUser(data.user);
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
      await fetch('/api/auth/superadmin/logout', { method: 'POST' });
      router.push('/auth/organization/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Stack align="center" gap="xs">
          <Loader color="datiaBlue" />
          <Text size="sm" c="dimmed">{t('loading')}</Text>
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
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="bi bi-buildings-fill" style={{ fontSize: '1.25rem', color: '#1752CC' }} />
            </div>
            <Text fw={600} fz="lg" c="#1f2937">Datia</Text>
            {user?.organizationName && (
              <Text size="sm" c="dimmed">{user.organizationName}</Text>
            )}
          </Group>

          <Group gap={4}>
            <Link
              href={NAV_HOME}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: pathname.startsWith(NAV_HOME) ? 600 : 400,
                color: pathname.startsWith(NAV_HOME) ? '#1752CC' : 'var(--mantine-color-dimmed)',
                background: pathname.startsWith(NAV_HOME) ? '#eff6ff' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              <i className="bi bi-buildings" />
              {t('nav.companies')}
            </Link>

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
              {t('logout')}
            </Button>
          </Group>
        </Group>
      </header>

      {/* Main content */}
      <main style={{ flexGrow: 1, padding: '48px 24px' }}>
        {user ? children : null}
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
        <Group justify="center" gap={8}>
          <i className="bi bi-buildings" style={{ color: '#1752CC' }} />
          <Text size="sm" c="dimmed" fw={500}>{t('footer')}</Text>
        </Group>
      </footer>
    </div>
  );
}
