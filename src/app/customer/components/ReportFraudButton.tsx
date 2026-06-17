'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ReportFraudDrawer } from './ReportFraudDrawer';

interface ReportFraudButtonProps {
  itemId: string;
}

export function ReportFraudButton({ itemId }: ReportFraudButtonProps) {
  const t = useTranslations('fraudReport');
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          background: 'rgba(220, 38, 38, 0.06)',
          border: '1.5px solid rgba(220, 38, 38, 0.25)',
          borderRadius: '10px',
          cursor: 'pointer',
          width: '100%',
          marginTop: '1.25rem',
          color: '#b91c1c',
          fontSize: '0.875rem',
          fontWeight: 600,
          transition: 'all 0.15s',
        }}
        onTouchStart={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.12)';
        }}
        onTouchEnd={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,38,38,0.06)';
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ width: 18, height: 18, flexShrink: 0 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        {t('button')}
      </button>

      <ReportFraudDrawer
        itemId={itemId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
