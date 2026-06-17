'use client';

import Spinner from 'react-bootstrap/Spinner';

export default function LoadingOverlay() {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(255, 255, 255, 0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }}>
      <Spinner animation="border" role="status" />
    </div>
  );
}
