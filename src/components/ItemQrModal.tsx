'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';

type ItemQrModalProps = {
  show: boolean;
  onHide: () => void;
  itemId: string;
  itemName?: string;
};

export default function ItemQrModal({ show, onHide, itemId, itemName }: ItemQrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const itemUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const origin = window.location.origin;
      return `${origin}/customer/item/${encodeURIComponent(itemId)}`;
    } catch {
      return `/customer/item/${encodeURIComponent(itemId)}`;
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
        await QR.toCanvas(canvas, itemUrl, {
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
  }, [show, itemUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr_item_${itemId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(itemUrl);
    } catch {}
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-qr-code"></i>
          {itemName ? `QR de ${itemName}` : 'Código QR del item'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column align-items-center text-center">
          <canvas ref={canvasRef} style={{ width: 260, height: 260 }} />
          <div className="text-muted small mt-2" style={{ wordBreak: 'break-all' }}>{itemUrl}</div>
          {error && <div className="text-danger mt-2">{error}</div>}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={handleCopyUrl}>
          <i className="bi bi-clipboard me-1" /> Copiar enlace
        </Button>
        <Button variant="primary" onClick={handleDownload}>
          <i className="bi bi-download me-1" /> Descargar PNG
        </Button>
      </Modal.Footer>
    </Modal>
  );
}


