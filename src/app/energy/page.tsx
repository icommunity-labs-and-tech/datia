'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EnergyPortalHome() {
  const [itemId, setItemId] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemId.trim()) router.push(`/energy/${itemId.trim()}`);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #059669, #0d9488)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <i className="bi bi-leaf text-white" style={{ fontSize: '2rem' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#064e3b', marginBottom: '0.5rem' }}>Datia</h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Portal de certificación energética y huella de carbono</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid rgba(16,185,129,0.1)' }}>
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', textAlign: 'left', fontWeight: 500, color: '#374151', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              ID del activo
            </label>
            <input
              type="text"
              value={itemId}
              onChange={e => setItemId(e.target.value)}
              placeholder="Ej: DATIA-PV-001"
              className="form-control mb-3"
              style={{ borderRadius: 10, borderColor: '#d1fae5' }}
            />
            <button type="submit" className="btn w-100 text-white" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', borderRadius: 10, padding: '0.65rem', fontWeight: 600 }}>
              <i className="bi bi-search me-2" />Consultar certificación
            </button>
          </form>

          <hr style={{ margin: '1.5rem 0', borderColor: '#d1fae5' }} />
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: 0 }}>
            <i className="bi bi-info-circle me-1" />
            Introduce el ID del activo para consultar su huella de carbono certificada y datos de consumo energético
          </p>
        </div>
      </div>
    </div>
  );
}
