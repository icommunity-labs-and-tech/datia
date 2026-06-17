interface UseUnifiedScannerOptions {
  appContext?: 'dashboard' | 'operator' | 'customer';
  returnUrl?: string;
  onSuccessUrl?: string;
  openInNewTab?: boolean;
}

export function useUnifiedScanner(options: UseUnifiedScannerOptions = {}) {
  const {
    appContext = 'dashboard',
    returnUrl,
    onSuccessUrl,
    openInNewTab = true,
  } = options;

  const openScanner = (customOptions?: Partial<UseUnifiedScannerOptions>) => {
    const params = new URLSearchParams();
    
    // Contexto de la aplicación
    params.set('app', customOptions?.appContext || appContext);
    
    // URL de retorno
    if (customOptions?.returnUrl || returnUrl) {
      params.set('returnUrl', customOptions?.returnUrl || returnUrl!);
    }
    
    // URL de éxito personalizada
    if (customOptions?.onSuccessUrl || onSuccessUrl) {
      params.set('onSuccessUrl', customOptions?.onSuccessUrl || onSuccessUrl!);
    }

    const scannerUrl = `/scanner?${params.toString()}`;
    
    // Abrir en nueva pestaña por defecto para mejor UX
    if (customOptions?.openInNewTab !== false && openInNewTab !== false) {
      window.open(scannerUrl, '_blank');
    } else {
      // Fallback para navegación en la misma pestaña si se especifica
      window.location.href = scannerUrl;
    }
  };

  return {
    openScanner,
  };
}
