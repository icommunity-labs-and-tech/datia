'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Container, Nav, Navbar, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Link from 'next/link';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
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
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-danger" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Top Navbar */}
      <Navbar 
        variant="light" 
        style={{
          background: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}
      >
        <Container fluid>
          <Navbar.Brand className="d-flex align-items-center" style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}
            >
              <i className="bi bi-shield-lock-fill text-danger" style={{ fontSize: '1.25rem' }}></i>
            </div>
            <div style={{ lineHeight: 1.2, color: '#1f2937' }}>certypass</div>
          </Navbar.Brand>
          <Nav className="ms-auto align-items-center">
            <Nav.Link
              as={Link}
              href="/superadmin"
              className={pathname === '/superadmin' ? 'text-danger fw-semibold' : 'text-muted'}
              style={{
                transition: 'all 0.2s',
                borderRadius: '6px',
                padding: '6px 12px',
                ...(pathname === '/superadmin' && {
                  background: '#fef2f2',
                  color: '#dc2626'
                })
              }}
            >
              <i className="bi bi-house me-1"></i>
              Inicio
            </Nav.Link>
            <Nav.Link
              as={Link}
              href="/superadmin/organizations"
              className={pathname === '/superadmin/organizations' ? 'text-danger fw-semibold' : 'text-muted'}
              style={{
                transition: 'all 0.2s',
                borderRadius: '6px',
                padding: '6px 12px',
                ...(pathname === '/superadmin/organizations' && {
                  background: '#fef2f2',
                  color: '#dc2626'
                })
              }}
            >
              <i className="bi bi-building me-1"></i>
              Organizaciones
            </Nav.Link>
            <Nav.Link
              as={Link}
              href="/superadmin/support-messages"
              className={pathname === '/superadmin/support-messages' ? 'text-danger fw-semibold' : 'text-muted'}
              style={{
                transition: 'all 0.2s',
                borderRadius: '6px',
                padding: '6px 12px',
                ...(pathname === '/superadmin/support-messages' && {
                  background: '#fef2f2',
                  color: '#dc2626'
                })
              }}
            >
              <i className="bi bi-chat-dots me-1"></i>
              Soporte
            </Nav.Link>
            <div className="vr mx-3" style={{ opacity: 0.2 }}></div>
            <Nav.Link className="text-muted d-flex align-items-center" style={{ padding: '6px 12px' }}>
              <i className="bi bi-person-circle me-2" style={{ fontSize: '1.25rem' }}></i>
              <span style={{ fontSize: '0.9rem' }}>{user?.name || user?.email}</span>
            </Nav.Link>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleLogout}
              className="ms-2"
              style={{
                borderWidth: '1px',
                fontWeight: 500,
                borderRadius: '6px',
                transition: 'all 0.2s',
                color: '#6b7280',
                borderColor: '#d1d5db'
              }}
            >
              <i className="bi bi-box-arrow-right me-1"></i>
              Salir
            </Button>
          </Nav>
        </Container>
      </Navbar>

      {/* Main Content */}
      <Container fluid className="flex-grow-1 py-5 px-4">
        {children}
      </Container>

      {/* Footer */}
      <footer 
        className="border-top mt-auto"
        style={{
          background: 'white',
          borderTop: '1px solid #dee2e6',
          padding: '1.5rem 0'
        }}
      >
        <Container fluid>
          <div className="text-center">
            <div className="d-flex align-items-center justify-content-center mb-2">
              <i className="bi bi-shield-check text-danger me-2"></i>
              <small className="text-muted" style={{ fontWeight: 500 }}>
                Panel de Super Administrador - certypass
              </small>
            </div>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>
              Acceso Restringido • Solo personal autorizado
            </small>
          </div>
        </Container>
      </footer>
    </div>
  );
}





