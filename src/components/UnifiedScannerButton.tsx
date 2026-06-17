'use client';

import { Button, ButtonProps } from 'react-bootstrap';
import { useUnifiedScanner } from '@/hooks/useUnifiedScanner';

interface UnifiedScannerButtonProps extends Omit<ButtonProps, 'onClick'> {
  appContext?: 'dashboard' | 'operator' | 'customer';
  returnUrl?: string;
  onSuccessUrl?: string;
  openInNewTab?: boolean;
  children?: React.ReactNode;
  showIcon?: boolean;
}

export default function UnifiedScannerButton({
  appContext = 'dashboard',
  returnUrl,
  onSuccessUrl,
  openInNewTab = true,
  children = 'Escanear QR',
  showIcon = true,
  variant = 'primary',
  size = 'sm',
  ...buttonProps
}: UnifiedScannerButtonProps) {
  const { openScanner } = useUnifiedScanner({
    appContext,
    returnUrl,
    onSuccessUrl,
    openInNewTab,
  });

  const handleClick = () => {
    openScanner();
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      {...buttonProps}
    >
      {showIcon && <i className="bi bi-qr-code me-md-2"></i>}
      <span className="d-none d-md-inline">{children}</span>
    </Button>
  );
}
