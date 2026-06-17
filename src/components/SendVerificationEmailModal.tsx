'use client';

import { useState, FormEvent } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { sendVerificationEmail } from '@/actions/items/send-verification-email';

type SendVerificationEmailModalProps = {
  show: boolean;
  onHide: () => void;
  itemId: string;
  itemName?: string;
};

export default function SendVerificationEmailModal({
  show,
  onHide,
  itemId,
  itemName,
}: SendVerificationEmailModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      const result = await sendVerificationEmail({
        itemId,
        recipientEmail: email,
        recipientName: name || undefined,
      });

      if (result.success) {
        setSuccess(true);
        setEmail('');
        setName('');
        // Cerrar modal después de 2 segundos
        setTimeout(() => {
          onHide();
          setSuccess(false);
        }, 2000);
      } else {
        setError(result.error || 'Error al enviar el email');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail('');
      setName('');
      setError(null);
      setSuccess(false);
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-envelope-paper"></i>
          Enviar enlace de verificación
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {itemName && (
            <p className="text-muted mb-3">
              Producto: <strong>{itemName}</strong>
            </p>
          )}
          
          {success && (
            <Alert variant="success" className="mb-3">
              <i className="bi bi-check-circle me-2"></i>
              Email enviado correctamente
            </Alert>
          )}

          {error && (
            <Alert variant="danger" className="mb-3">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
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
              disabled={isLoading || success}
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
              disabled={isLoading || success}
            />
          </Form.Group>

          <Alert variant="info" className="mb-0">
            <i className="bi bi-info-circle me-2"></i>
            El enlace ejecutará automáticamente la verificación antifalsificación del producto al ser abierto.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isLoading || success || !email.trim()}
          >
            {isLoading ? (
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
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
