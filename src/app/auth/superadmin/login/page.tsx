'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Button, Alert, Card, Container, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useTranslations } from 'next-intl';

export default function SuperAdminLoginPage() {
  const t = useTranslations('auth.login.superadmin');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/superadmin');
      } else {
        setError(data.error || t('errors.loginError'));
      }
    } catch {
      setError(t('errors.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container 
      fluid 
      className="d-flex align-items-center justify-content-center" 
      style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #ea580c 100%)',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: `
          repeating-linear-gradient(90deg, 
            transparent 0px, transparent 8px,
            rgba(251, 146, 60, 0.12) 9px, rgba(251, 146, 60, 0.12) 10px,
            transparent 11px, transparent 15px,
            rgba(251, 146, 60, 0.15) 16px, rgba(251, 146, 60, 0.15) 17px,
            transparent 18px, transparent 22px,
            rgba(251, 146, 60, 0.08) 23px, rgba(251, 146, 60, 0.08) 25px,
            transparent 26px, transparent 35px,
            rgba(251, 146, 60, 0.14) 36px, rgba(251, 146, 60, 0.14) 38px,
            transparent 39px, transparent 42px,
            rgba(251, 146, 60, 0.12) 43px, rgba(251, 146, 60, 0.12) 44px,
            transparent 45px, transparent 50px
          ),
          repeating-linear-gradient(0deg,
            transparent 0px, transparent 24px,
            rgba(220, 38, 38, 0.08) 25px,
            transparent 26px, transparent 50px
          ),
          repeating-linear-gradient(90deg,
            transparent 0px, transparent 24px,
            rgba(220, 38, 38, 0.08) 25px,
            transparent 26px, transparent 50px
          ),
          radial-gradient(circle at 20% 30%, rgba(251, 146, 60, 0.06) 2px, transparent 2px),
          radial-gradient(circle at 80% 40%, rgba(251, 146, 60, 0.06) 2px, transparent 2px),
          radial-gradient(circle at 40% 70%, rgba(251, 146, 60, 0.06) 2px, transparent 2px),
          radial-gradient(circle at 60% 20%, rgba(251, 146, 60, 0.06) 2px, transparent 2px),
          radial-gradient(circle at 90% 80%, rgba(251, 146, 60, 0.06) 2px, transparent 2px),
          linear-gradient(0deg, transparent 48%, rgba(251, 146, 60, 0.06) 49%, rgba(251, 146, 60, 0.06) 51%, transparent 52%),
          linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #ea580c 100%)
        `,
        backgroundSize: '100% 100%, 25px 25px, 25px 25px, 10px 10px, 10px 10px, 10px 10px, 10px 10px, 10px 10px, 100% 15px, 100% 100%'
      }}
    >
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: '400px', 
          position: 'relative', 
          zIndex: 1,
          borderRadius: '15px',
          backdropFilter: 'blur(10px)',
          background: 'rgba(255, 255, 255, 0.95)',
          border: 'none'
        }} 
        className="shadow-lg"
      >
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            <div className="mb-3">
              <i className="bi bi-shield-lock-fill text-danger" style={{ fontSize: '3rem' }}></i>
            </div>
            <h2 className="mb-2" style={{ fontWeight: 700 }}>{t('title')}</h2>
            <p className="text-muted">{t('subtitle')}</p>
          </div>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>{t('emailLabel')}</Form.Label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-envelope"></i>
                </span>
                <Form.Control
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>{t('passwordLabel')}</Form.Label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-lock"></i>
                </span>
                <Form.Control
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </Form.Group>

            <Button
              variant="danger"
              type="submit"
              className="w-100"
              size="lg"
              disabled={loading}
              style={{
                background: 'linear-gradient(45deg, #dc2626, #ea580c)',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600
              }}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  {t('accessing')}
                </>
              ) : (
                <>
                  <i className="bi bi-shield-check me-2"></i>
                  {t('access')}
                </>
              )}
            </Button>
          </Form>

          <hr className="my-4" />

          <div className="text-center">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              {t('exclusiveAccess')}
            </small>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}





