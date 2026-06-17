'use client';

import Box from '@/components/Box';
import { useRouter } from 'next/navigation';
import '@/components/GenericTable/GenericTable.css';

interface ItemStatesTableProps {
  states: Array<{
    id: string;
    title?: string | null;
    description?: string | null;
    createdAt: string | Date;
    statusType?: { id: string; name: string; description?: string | null } | null;
  }>;
  showBox?: boolean;
  className?: string;
}

export default function ItemStatesTable({ states, showBox = false, className = '' }: ItemStatesTableProps) {
  const router = useRouter();
  const content = (
    <div className={className}>
      {(!states || states.length === 0) ? (
        <div className="text-center py-4 text-muted">
          <i className="bi bi-clock-history fs-1 mb-3 d-block"></i>
          <p>No hay estados registrados para este item.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="custom-table mb-0 table-hover align-middle">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Título</th>
                <th>Descripción</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {states.map((st) => (
                <tr
                  key={st.id}
                  onDoubleClick={() => router.push(`/dashboard/states/${st.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span className="badge bg-info">
                      {st.statusType?.name || '—'}
                    </span>
                  </td>
                  <td>{st.title || '—'}</td>
                  <td className="text-muted">
                    {st.description && st.description.length > 90
                      ? st.description.substring(0, 90) + '…'
                      : st.description || '—'}
                  </td>
                  <td>{new Date(st.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (showBox) {
    return <Box>{content}</Box>;
  }

  return content;
}


