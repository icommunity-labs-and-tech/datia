'use client';
import 'bootstrap/dist/css/bootstrap.min.css';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';
import PageHeader from '@/components/Header';
import PageBody from '@/components/Body';
import { SidebarProvider, useSidebar } from '@/components/SidebarContext';
import { AuthProvider } from '@/hooks/useAuthSeparated';
import type { OrgModules } from './layout';

interface AppShellProps {
  children: React.ReactNode;
  logoUrl?: string | null;
  brandColorPrimary?: string | null;
  brandColorSecondary?: string | null;
  modules?: OrgModules;
}

export default function AppShell({ children, logoUrl, brandColorPrimary, brandColorSecondary, modules }: AppShellProps) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <Shell logoUrl={logoUrl} brandColorPrimary={brandColorPrimary} brandColorSecondary={brandColorSecondary} modules={modules}>
          {children}
        </Shell>
      </SidebarProvider>
    </AuthProvider>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function Shell({ children, logoUrl, brandColorPrimary, brandColorSecondary, modules }: AppShellProps) {
  const primary = brandColorPrimary ?? '#0d6efd';
  const secondary = brandColorSecondary ?? '#6c757d';
  const SIDEBAR_WIDTH = 250;
  const { isDesktop, isOpenMobile, isCollapsedDesktop, closeMobile } = useSidebar();
  const sidebarVisible = isDesktop ? !isCollapsedDesktop : isOpenMobile;

  const brandStyle = {
    '--bs-primary': primary,
    '--bs-primary-rgb': hexToRgb(primary),
    '--bs-secondary': secondary,
  } as React.CSSProperties;

  return (
    <div className="d-flex" style={{ minHeight: '100vh', ...brandStyle }}>
      <style>{`
        .bg-primary { background-color: ${primary} !important; }
        .text-primary { color: ${primary} !important; }
        .btn-primary { background-color: ${primary} !important; border-color: ${primary} !important; }
        .btn-primary:hover { filter: brightness(0.9); }
        .nav-link.bg-primary { background-color: ${primary} !important; }
      `}</style>
      <div
        className="p-0"
        style={{
          position: 'fixed',
          width: `${SIDEBAR_WIDTH}px`,
          height: '100vh',
          transform: sidebarVisible ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          zIndex: 1050,
        }}
      >
        <Sidebar logoUrl={logoUrl} modules={modules} />
      </div>

      {!isDesktop && isOpenMobile && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1030,
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={closeMobile}
        />
      )}

      <div
        className={`flex-grow-1 d-flex flex-column ${!isDesktop && isOpenMobile ? 'sidebar-open-mobile' : ''}`}
        style={{
          marginLeft: isDesktop && !isCollapsedDesktop ? `${SIDEBAR_WIDTH}px` : 0,
          minHeight: '100vh',
          transition: 'margin-left 0.25s ease, filter 0.25s ease',
          filter: !isDesktop && isOpenMobile ? 'blur(2px)' : 'none',
        }}
      >
        <main className="flex-grow-1 px-4 py-3 d-flex flex-column">
          <PageHeader />
          <div className="flex-grow-1 d-flex mt-4">
            <PageBody>{children}</PageBody>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
