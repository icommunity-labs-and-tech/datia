'use client';

import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { sendVerificationEmail } from '@/actions/items/send-verification-email';

type ItemVerifyQrModalProps = {
  show: boolean;
  onHide: () => void;
  itemId: string;
  itemName?: string;
};

export default function ItemVerifyQrModal({ show, onHide, itemId, itemName }: ItemVerifyQrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const verifyUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const origin = window.location.origin;
      return `${origin}/customer/verify/${encodeURIComponent(itemId)}`;
    } catch {
      return `/customer/verify/${encodeURIComponent(itemId)}`;
    }
  }, [itemId]);

  useEffect(() => {
    let cancelled = false;
    const draw = async () => {
      if (!show) return;
      setError(null);
      try {
        const mod = await import('qrcode');
        if (cancelled) return;
        const QR = (mod as any).default || mod;
        const canvas = canvasRef.current;
        if (!canvas) return;
        await QR.toCanvas(canvas, verifyUrl, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 260,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
      } catch (e: any) {
        setError(e?.message || 'No se pudo generar el QR');
      }
    };

    draw();
    return () => { cancelled = true; };
  }, [show, verifyUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr_verify_${itemId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
    } catch {}
  };

  const handleSendEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(false);
    setIsLoadingEmail(true);

    try {
      const result = await sendVerificationEmail({
        itemId,
        recipientEmail: email,
        recipientName: name || undefined,
      });

      if (result.success) {
        setEmailSuccess(true);
        setEmail('');
        setName('');
        // Ocultar formulario después de 2 segundos
        setTimeout(() => {
          setShowEmailForm(false);
          setEmailSuccess(false);
        }, 2000);
      } else {
        setEmailError(result.error || 'Error al enviar el email');
      }
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Error al enviar el email');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleClose = () => {
    setShowEmailForm(false);
    setEmail('');
    setName('');
    setEmailError(null);
    setEmailSuccess(false);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered size={showEmailForm ? 'lg' : undefined}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className={showEmailForm ? "bi bi-envelope-paper" : "bi bi-shield-check"}></i>
          {showEmailForm
            ? 'Enviar enlace de verificación por correo'
            : (itemName ? `QR de Verificación - ${itemName}` : 'Código QR de Verificación')
          }
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {showEmailForm ? (
          <Form id="email-form" onSubmit={handleSendEmail}>
            {itemName && (
              <p className="text-muted mb-3">
                Producto: <strong>{itemName}</strong>
              </p>
            )}
            
            {emailSuccess && (
              <Alert variant="success" className="mb-3">
                <i className="bi bi-check-circle me-2"></i>
                Email enviado correctamente
              </Alert>
            )}

            {emailError && (
              <Alert variant="danger" className="mb-3">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {emailError}
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>
                Email del destinatario <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoadingEmail || emailSuccess}
              />
              <Form.Text className="text-muted">
                Se enviará el enlace de verificación a este correo electrónico
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nombre del destinatario (opcional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoadingEmail || emailSuccess}
              />
            </Form.Group>

            <Alert variant="info" className="mb-0">
              <i className="bi bi-info-circle me-2"></i>
              El enlace ejecutará automáticamente la verificación antifalsificación del producto al ser abierto.
            </Alert>
          </Form>
        ) : (
          <div className="d-flex flex-column align-items-center text-center">
            <div className="alert alert-info mb-3" role="alert">
              <i className="bi bi-info-circle me-2"></i>
              Este QR ejecuta la verificación antifraude al escanearlo
            </div>
            <canvas ref={canvasRef} style={{ width: 260, height: 260 }} />
            <div className="text-muted small mt-2" style={{ wordBreak: 'break-all' }}>{verifyUrl}</div>
            {error && <div className="text-danger mt-2">{error}</div>}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between align-items-center">
        {showEmailForm ? (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowEmailForm(false);
                setEmail('');
                setName('');
                setEmailError(null);
                setEmailSuccess(false);
              }}
              disabled={isLoadingEmail}
            >
              Volver
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="email-form"
              disabled={isLoadingEmail || emailSuccess || !email.trim()}
              onClick={(e) => {
                e.preventDefault();
                const form = document.getElementById('email-form') as HTMLFormElement;
                if (form) {
                  form.requestSubmit();
                }
              }}
            >
              {isLoadingEmail ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Enviando...
                </>
              ) : (
                <>
                  <i className="bi bi-envelope me-2"></i>
                  Enviar
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="d-flex gap-2 w-100 justify-content-end">
            <Button variant="outline-secondary" onClick={handleCopyUrl}>
              <i className="bi bi-clipboard me-1" /> Copiar enlace
            </Button>
            <Button variant="outline-warning" onClick={() => setShowEmailForm(true)}>
              <i className="bi bi-envelope me-1" /> Enviar por correo
            </Button>
            <Button variant="primary" onClick={handleDownload}>
              <i className="bi bi-download me-1" /> Descargar PNG
            </Button>
          </div>
        )}
      </Modal.Footer>
    </Modal>
  );
}
