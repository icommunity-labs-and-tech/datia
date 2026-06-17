"use client";

import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import './DownloadZipButton.css';

type ZipFromAction = { filename: string; contentType: string; base64: string };

type DownloadZipButtonProps = {
  label?: string;
  iconClassName?: string;
  variant?: string;
  size?: 'sm' | 'lg';
  className?: string;
  disabled?: boolean;
  getZip?: () => Promise<ZipFromAction>;
  url?: string;
};

// Componente de spinner de tarta personalizado
function PieSpinner({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const spinnerSize = size === 'sm' ? '16px' : '20px';
  
  return (
    <div 
      className="pie-spinner me-2" 
      style={{ 
        width: spinnerSize, 
        height: spinnerSize,
        borderRadius: '50%',
        border: '2px solid transparent',
        borderTop: '2px solid currentColor',
        animation: 'spin 1s linear infinite'
      }}
    />
  );
}

// Componente de barra de progreso
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="progress-bar-container me-2" style={{ width: '20px', height: '16px' }}>
      <div 
        className="progress-fill"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'currentColor',
          borderRadius: '2px',
          transform: `scaleX(${progress})`,
          transformOrigin: 'left',
          transition: 'transform 0.3s ease'
        }}
      />
    </div>
  );
}

export default function DownloadZipButton({
  label = 'Descargar ZIP',
  iconClassName = 'bi bi-download me-2',
  variant = 'primary',
  size,
  className,
  disabled,
  getZip,
  url,
}: DownloadZipButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadState, setDownloadState] = useState<'idle' | 'preparing' | 'downloading' | 'success' | 'error'>('idle');

  const handleClick = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setDownloadState('preparing');
    setProgress(0);
    
    try {
      if (getZip) {
        // Simular progreso de preparación
        setProgress(0.3);
        setDownloadState('preparing');
        
        // Simular progreso de descarga
        setTimeout(() => setProgress(0.6), 300);
        setTimeout(() => setProgress(0.8), 600);
        
        const { filename, contentType, base64 } = await getZip();
        
        setProgress(0.9);
        setDownloadState('downloading');
        
        const blob = base64ToBlob(base64, contentType);
        triggerDownload(blob, filename);
        
        setProgress(1);
        setDownloadState('success');
        
        // Resetear después de mostrar éxito
        setTimeout(() => {
          setDownloadState('idle');
          setProgress(0);
        }, 1500);
        
      } else if (url) {
        setProgress(0.5);
        setDownloadState('downloading');
        
        // Delegate download to the browser
        const a = document.createElement('a');
        a.href = url;
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        setProgress(1);
        setDownloadState('success');
        
        setTimeout(() => {
          setDownloadState('idle');
          setProgress(0);
        }, 1500);
        
        return;
      }
    } catch (e) {
      console.error('Error en descarga ZIP', e);
      setDownloadState('error');
      
      // Resetear después de mostrar error
      setTimeout(() => {
        setDownloadState('idle');
        setProgress(0);
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  // Determinar el contenido del botón según el estado
  const getButtonContent = () => {
    switch (downloadState) {
      case 'preparing':
        return (
          <>
            <PieSpinner size={size} />
            Preparando...
          </>
        );
      case 'downloading':
        return (
          <>
            <ProgressBar progress={progress} />
            Descargando...
          </>
        );
      case 'success':
        return (
          <>
            <i className="bi bi-check-circle me-2" />
            ¡Descargado!
          </>
        );
      case 'error':
        return (
          <>
            <i className="bi bi-exclamation-triangle me-2" />
            Error
          </>
        );
      default:
        return (
          <>
            {iconClassName ? <i className={iconClassName} /> : null}
            {label}
          </>
        );
    }
  };

  // Determinar la variante del botón según el estado
  const getButtonVariant = () => {
    switch (downloadState) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      default:
        return variant;
    }
  };

  // Determinar clases adicionales según el estado
  const getAdditionalClasses = () => {
    switch (downloadState) {
      case 'success':
        return 'download-button-success';
      case 'error':
        return 'download-button-error';
      default:
        return '';
    }
  };

  return (
    <Button 
      variant={getButtonVariant()} 
      size={size} 
      className={`${className || ''} ${getAdditionalClasses()}`}
      disabled={disabled || isLoading} 
      onClick={handleClick}
    >
      {getButtonContent()}
    </Button>
  );
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binaryString = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download.zip';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
