'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';

export default function CheckerHomePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const go = () => {
    const v = inputRef.current?.value?.trim();
    if (v) router.push(`/checker/${encodeURIComponent(v)}`);
  };

  return (
    <div className="customer-container">
      <div className="customer-content">
        <div className="scan-section">
          <div className="scan-card" style={{ maxWidth: 540 }}>
            <div className="scan-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9h6v12H3z"/>
                <path d="M15 3h6v18h-6z"/>
                <path d="M9 3h6v18H9z"/>
              </svg>
            </div>
            <h2>Verificador de estados</h2>
            <p>Introduce el identificador del estado para comprobar su integridad en blockchain.</p>

            <div className="scan-actions">
              <div className="manual-input">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="ID del estado"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') go();
                  }}
                />
                <button className="manual-button" onClick={go}>
                  Verificar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="customer-footer">
        <p>&copy; 2026 certypass - Verificador</p>
      </div>
    </div>
  );
}


