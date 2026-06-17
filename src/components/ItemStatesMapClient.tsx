'use client';

import dynamic from 'next/dynamic';
import { Spinner } from 'react-bootstrap';

interface StateWithLocation {
  id: string;
  title: string;
  description?: string;
  createdAt?: Date | string;
  templateConfig?: any;
  statusType?: {
    name: string;
  };
}

interface ItemStatesMapProps {
  states: StateWithLocation[];
}

// Cargar el componente del mapa solo en el cliente
const ItemStatesMapInternal = dynamic(
  () => import('./ItemStatesMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="d-flex align-items-center justify-content-center" style={{ height: '500px', border: '2px solid #e9ecef', borderRadius: '8px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-2" />
          <p className="text-muted mb-0">Cargando mapa...</p>
        </div>
      </div>
    )
  }
);

export default function ItemStatesMap(props: ItemStatesMapProps) {
  return <ItemStatesMapInternal {...props} />;
}




