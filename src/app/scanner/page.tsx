'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { extractItemIdFromQrData } from '@/lib/qr';

// Componente simple para mostrar un mensaje de error
function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-overlay">
      <div className="error-dialog">
        <div className="error-icon">⚠️</div>
        <div className="error-text">{message}</div>
        <button className="retry-button" onClick={onRetry}>
          Reintentar
        </button>
      </div>
      <style jsx>{`
        .error-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        .error-dialog {
          background: white;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          max-width: 400px;
          margin: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .error-text {
          color: #333;
          margin-bottom: 16px;
          font-size: 16px;
        }
        .retry-button {
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}

function ScannerPageContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const jsqrRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Obtener parámetros de la URL para determinar el contexto
  const appContext = searchParams.get('app') || 'dashboard';
  const returnUrl = searchParams.get('returnUrl') || '/';
  const onSuccessUrl = searchParams.get('onSuccessUrl');

  const handleScanSuccess = async (code: string) => {
    try {
      setIsProcessing(true);
      
      // Extraer el ID del item del código QR
      const itemId = extractItemIdFromQrData(code);
      
      if (!itemId) {
        setError('No se pudo extraer el ID del item del código QR');
        return;
      }

      // Determinar la URL de redirección según el contexto
      let redirectUrl = onSuccessUrl;
      
      if (!redirectUrl) {
        switch (appContext) {
          case 'operator':
            redirectUrl = `/operator/items/${itemId}`;
            break;
          case 'customer':
            redirectUrl = `/customer/item/${itemId}`;
            break;
          case 'dashboard':
          default:
            // La página de pasaportes se eliminó; siempre ir al detalle del item
            redirectUrl = `/dashboard/items/${itemId}`;
            break;
        }
      }

      // Usar window.location para evitar problemas de navegación
      window.location.href = redirectUrl;
      
    } catch (err) {
      setError('Error al procesar el código QR escaneado');
      console.error('Error processing QR code:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseScanner = () => {
    // Usar window.location para evitar problemas de navegación
    window.location.href = returnUrl;
  };

  const handleRetry = () => {
    setError(null);
    setIsScanning(false);
    // Reiniciar el scanner después de un breve delay
    setTimeout(() => {
      setIsScanning(true);
    }, 100);
  };

  // Inicializar scanner al montar el componente
  useEffect(() => {
    let mounted = true;
    
    const initScanner = async () => {
      try {
        setIsScanning(true);
        
        // Esperar un poco para que la página se estabilice
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!mounted) return;
        
        // Cargar jsQR
        if (!jsqrRef.current) {
          const mod = await import('jsqr');
          jsqrRef.current = (mod as any).default || mod;
        }

        if (!mounted) return;

        // Obtener acceso a la cámara con manejo de errores mejorado
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;
        
        if (videoRef.current && mounted) {
          videoRef.current.srcObject = stream;
          
          // Esperar a que el video esté listo
          await new Promise((resolve, reject) => {
            if (!videoRef.current) {
              reject(new Error('Video element not available'));
              return;
            }
            
            const video = videoRef.current;
            
            const onLoadedMetadata = () => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              resolve(undefined);
            };
            
            const onError = (e: Event) => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              reject(new Error('Video failed to load'));
            };
            
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);
            
            video.play().catch(reject);
          });
          
          if (!mounted) return;
          
          // Iniciar escaneo
          const tick = () => {
            if (!mounted || !isScanning || !videoRef.current || !canvasRef.current) return;
            
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            if (ctx && video.videoWidth && video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsqrRef.current(imageData.data, canvas.width, canvas.height);
              
              if (code && code.data) {
                handleScanSuccess(code.data);
                return;
              }
            }
            
            if (mounted) {
              rafIdRef.current = requestAnimationFrame(tick);
            }
          };
          
          tick();
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
          setError('Error al acceder a la cámara: ' + errorMessage);
          console.error('Scanner error:', err);
        }
      }
    };

    initScanner();

    // Cleanup
    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isScanning]);

  // Efecto adicional para limpiar al desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  return (
    <div className="scanner-page">
      {error && (
        <ErrorMessage message={error} onRetry={handleRetry} />
      )}

      {isProcessing && (
        <div className="scanner-processing-overlay">
          <div className="scanner-processing-content">
            <div className="spinner"></div>
            <p>Procesando código QR...</p>
          </div>
        </div>
      )}

      <div className="scanner-header">
        <button 
          className="scanner-close-btn"
          onClick={handleCloseScanner}
        >
          ✕
        </button>
        <div className="scanner-title">
          📱 Escáner QR
        </div>
      </div>

      <div className="scanner-content">
        <video
          ref={videoRef}
          className="scanner-video"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="scanner-canvas"
          style={{ display: 'none' }}
        />
        <div className="scanner-overlay-ui">
          <div className="scanner-frame"></div>
          <div className="scanner-line"></div>
        </div>
      </div>

      <style jsx>{`
        .scanner-page {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
          z-index: 9999;
          margin: 0;
          padding: 0;
        }
        
        .scanner-processing-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        
        .scanner-processing-content {
          text-align: center;
          color: white;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .scanner-header {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10001;
        }
        
        .scanner-close-btn {
          border: none;
          background: transparent;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .scanner-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .scanner-title {
          font-size: 18px;
          font-weight: 500;
        }
        
        .scanner-content {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .scanner-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .scanner-overlay-ui {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .scanner-frame {
          width: 250px;
          height: 250px;
          border: 2px solid white;
          border-radius: 12px;
          position: relative;
        }
        
        .scanner-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: #007bff;
          animation: scan 2s linear infinite;
        }
        
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

export default function ScannerPage() {
  return (
    <Suspense fallback={
      <div className="scanner-loading">
        <div className="spinner"></div>
        <p>Cargando escáner...</p>
        <style dangerouslySetInnerHTML={{
          __html: `
            .scanner-loading {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: #000;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: white;
              margin: 0;
              padding: 0;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 4px solid rgba(255, 255, 255, 0.3);
              border-top: 4px solid white;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </div>
    }>
      <ScannerPageContent />
    </Suspense>
  );
}


