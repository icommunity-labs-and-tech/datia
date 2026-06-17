'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Alert } from 'react-bootstrap';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCode: (text: string) => void;
  variant?: 'desktop' | 'mobile'; // Nuevo prop para elegir el estilo
};

export default function ScannerOverlay({ isOpen, onClose, onCode, variant = 'desktop' }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const jsqrRef = useRef<any>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const enumerate = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const cams = list.filter((d) => d.kind === 'videoinput');
        setDevices(cams);
        if (!selectedCameraId && cams.length > 0) setSelectedCameraId(cams[0].deviceId);
      } catch {}
    };
    enumerate();
  }, [selectedCameraId]);

  useEffect(() => {
    let cancelled = false;

    const stop = () => {
      const v = videoRef.current;
      if (v && v.srcObject) {
        const tracks = (v.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
        v.srcObject = null;
      }
      trackRef.current = null;
      setTorchOn(false);
      setIsProcessing(false);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    const start = async () => {
      try {
        if (!jsqrRef.current) {
          const mod = await import('jsqr');
          jsqrRef.current = (mod as any).default || mod;
        }

        const constraints: MediaStreamConstraints = {
          video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: 'environment' },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        await new Promise<void>((resolve) => {
          const startTs = Date.now();
          const check = () => {
            if (!isOpen || cancelled) return resolve();
            if (videoRef.current) return resolve();
            if (Date.now() - startTs > 3000) return resolve();
            requestAnimationFrame(check);
          };
          check();
        });

        const video = videoRef.current!;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        const [track] = stream.getVideoTracks();
        trackRef.current = track || null;

        const tick = () => {
          if (!isOpen || cancelled) return;
          const canvas = canvasRef.current!;
          const ctx = canvas.getContext('2d');
          if (ctx && video.videoWidth && video.videoHeight) {
            const w = (canvas.width = video.videoWidth);
            const h = (canvas.height = video.videoHeight);
            ctx.drawImage(video, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const code = jsqrRef.current(imageData.data as any, w, h);
            if (code && code.data) {
              setIsProcessing(true);
              // Cerrar y detener escaneo inmediatamente para evitar múltiples lecturas
              try {
                onClose();
              } catch {}
              if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
              }
              try {
                const v = videoRef.current;
                if (v && v.srcObject) {
                  const tracks = (v.srcObject as MediaStream).getTracks();
                  tracks.forEach((t) => t.stop());
                  v.srcObject = null;
                }
                trackRef.current = null;
              } catch {}
              onCode(code.data);
              return;
            }
          }
          rafIdRef.current = requestAnimationFrame(tick);
        };
        rafIdRef.current = requestAnimationFrame(tick);
      } catch (e: any) {
        const msg = e?.message || '';
        if (msg.toLowerCase().includes('not allowed') || msg.toLowerCase().includes('denied')) {
          setError('Permiso de cámara denegado');
        } else if (msg.toLowerCase().includes('not found')) {
          setError('No se encontró cámara disponible');
        } else if (msg.toLowerCase().includes('cancel')) {
          // ignore
        } else {
          setError(msg || 'No se pudo acceder a la cámara');
        }
        // Mantener el overlay abierto para mostrar el error, sin cerrar inmediatamente
      }
    };

    if (isOpen) {
      start();
    } else {
      stop();
    }
    
    return () => { 
      cancelled = true; 
      stop(); 
    };
  }, [isOpen, selectedCameraId, onClose, onCode]);

  // Renderizado condicional basado en la variante
  if (variant === 'mobile') {
    // Solo renderizar si está abierto
    if (!isOpen) return null;
    
    return (
      <div className="mobile-scanner-overlay">
        <div className="mobile-scanner-container">
          {/* Header */}
          <div className="scanner-header">
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={onClose}
              className="close-btn"
            >
              ✕ Cerrar
            </Button>
            <div className="scanner-title">Escanear QR</div>
            <div className="scanner-actions">
              {devices.length > 1 && (
                <select
                  className="form-select form-select-sm camera-select"
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                >
                  {devices.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      {d.label || `Cámara ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Área del escáner */}
          <div className="scanner-area">
            <video 
              ref={videoRef} 
              className="scanner-video" 
              muted 
              playsInline 
              autoPlay
            />
            <div className="scanner-overlay-ui">
              <div className="scanner-frame" />
              <div className="scanner-line" />
              <div className="scanner-corners">
                <div className="corner top-left" />
                <div className="corner top-right" />
                <div className="corner bottom-left" />
                <div className="corner bottom-right" />
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="scanner-controls">
            <div className="control-row">
              <Button 
                variant="outline-light" 
                size="sm"
                onClick={async () => {
                  try {
                    const track = trackRef.current;
                    if (!track) return;
                    // @ts-expect-error - torch puede no estar disponible en todos los navegadores
                    await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
                    setTorchOn(!torchOn);
                  } catch {}
                }}
              >
                {torchOn ? '🔦 Apagar' : '🔦 Linterna'}
              </Button>
              <div className="scanner-instructions">
                <small className="text-light">
                  {isProcessing ? (
                    <>
                      <i className="bi bi-hourglass-split me-1"></i>
                      Procesando código...
                    </>
                  ) : (
                    'Alinea el código QR dentro del marco'
                  )}
                </small>
              </div>
            </div>
          </div>

          {/* Mostrar errores */}
          {error && (
            <Alert variant="danger" className="scanner-error">
              {error}
              <Button 
                variant="outline-danger" 
                size="sm" 
                className="ms-2"
                onClick={() => {
                  setError(null);
                  onClose();
                }}
              >
                Cerrar
              </Button>
            </Alert>
          )}

          {/* Canvas oculto para procesamiento */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <style jsx>{`
          .mobile-scanner-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
          }

          .mobile-scanner-container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #000;
          }

          .scanner-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: rgba(0, 0, 0, 0.8);
            color: white;
          }

          .scanner-title {
            font-size: 1.2rem;
            font-weight: 600;
          }

          .camera-select {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            font-size: 0.9rem;
          }

          .camera-select option {
            background: #333;
            color: white;
          }

          .scanner-area {
            flex: 1;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: #000;
          }

          .scanner-video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            background: #000;
          }

          .scanner-overlay-ui {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
          }

          .scanner-frame {
            position: absolute;
            top: 10%;
            left: 10%;
            width: 80%;
            height: 80%;
            border: 3px solid rgba(255, 255, 255, 0.85);
            border-radius: 12px;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.35) inset;
          }

          .scanner-line {
            position: absolute;
            left: 10%;
            width: 80%;
            height: 2px;
            background: linear-gradient(90deg, transparent, #0d6efd, transparent);
            animation: scanMove 2s linear infinite;
          }

          @keyframes scanMove {
            0% { top: 12%; }
            100% { top: 86%; }
          }

          .scanner-corners {
            position: absolute;
            top: 10%;
            left: 10%;
            width: 80%;
            height: 80%;
          }

          .corner {
            position: absolute;
            width: 20px;
            height: 20px;
            border: 3px solid #0d6efd;
          }

          .top-left {
            top: 0;
            left: 0;
            border-right: none;
            border-bottom: none;
            border-top-left-radius: 10px;
          }

          .top-right {
            top: 0;
            right: 0;
            border-left: none;
            border-bottom: none;
            border-top-right-radius: 10px;
          }

          .bottom-left {
            bottom: 0;
            left: 0;
            border-right: none;
            border-top: none;
            border-bottom-left-radius: 10px;
          }

          .bottom-right {
            bottom: 0;
            right: 0;
            border-left: none;
            border-top: none;
            border-bottom-right-radius: 10px;
          }

          .scanner-controls {
            padding: 1rem;
            background: rgba(0, 0, 0, 0.8);
          }

          .control-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .scanner-instructions {
            text-align: center;
            flex: 1;
            margin-left: 1rem;
          }

          .scanner-error {
            margin: 1rem;
            border-radius: 8px;
          }

          @media (max-width: 768px) {
            .scanner-title {
              font-size: 1rem;
            }
          }
        `}</style>
      </div>
    );
  }

  // Variante desktop (original)
  // Solo renderizar si está abierto
  if (!isOpen) return null;
  
  return (
    <div className={`scanner-overlay ${isOpen ? 'open' : ''}`}>
      <div className="scanner-only p-2">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <button className="btn btn-light" onClick={onClose}>Cerrar</button>
          <div className="text-white">Escanear QR</div>
          <div style={{ width: 64 }} />
        </div>
        {devices.length > 0 && (
          <select
            className="form-select form-select-sm mb-2"
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
          >
            {devices.map((d, idx) => (
              <option key={d.deviceId || idx} value={d.deviceId}>{d.label || `Cámara ${idx + 1}`}</option>
            ))}
          </select>
        )}
        <div className="scan-container">
          <video ref={videoRef} className="video" muted playsInline />
          <div className="overlay">
            <div className="frame" />
            <div className="scan-line" />
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 mt-2">
          <button
            type="button"
            className={`btn ${torchOn ? 'btn-warning' : 'btn-outline-warning'}`}
            onClick={async () => {
              try {
                const track = trackRef.current;
                if (!track) return;
                // @ts-expect-error torch may not be supported in all browsers
                await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
                setTorchOn(!torchOn);
              } catch {}
            }}
          >
            {torchOn ? 'Apagar linterna' : 'Linterna'}
          </button>
          <div className="text-muted small">Alinea el QR dentro del marco</div>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {error && <div className="text-danger mt-2">{error}</div>}
      </div>

      <style jsx>{`
        .scanner-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); opacity: 0; pointer-events: none; display: flex; align-items: center; justify-content: center; z-index: 1050; transition: opacity 250ms ease; }
        .scanner-overlay.open { opacity: 1; pointer-events: auto; }
        .scanner-only { width: 100%; max-width: 560px; }
        .scan-container { position: relative; width: 100%; max-width: 520px; aspect-ratio: 4 / 3; background: #000; overflow: hidden; border-radius: 8px; }
        .scan-container .video { width: 100%; height: 100%; object-fit: cover; }
        .overlay { position: absolute; inset: 0; pointer-events: none; }
        .frame { position: absolute; top: 10%; left: 10%; width: 80%; height: 80%; border: 3px solid rgba(255, 255, 255, 0.85); border-radius: 12px; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.35) inset; }
        .scan-line { position: absolute; left: 10%; width: 80%; height: 2px; background: linear-gradient(90deg, transparent, #0d6efd, transparent); animation: scanMove 2s linear infinite; }
        @keyframes scanMove { 0% { top: 12%; } 100% { top: 86%; } }
      `}</style>
    </div>
  );
}


