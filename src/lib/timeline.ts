import { TimelineItem } from '@/components/Timeline';

export interface ItemState {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  imageUrls: string[];
  evidenceID?: string;
  backed?: boolean;
  templateConfig?: any;
  statusType?: {
    id: string;
    name: string;
    description: string;
  };
}

/**
 * Convierte los estados de un item al formato del Timeline
 */
export function convertStatesToTimeline(states: ItemState[]): TimelineItem[] {
  return states.map((state, index) => ({
    id: state.id,
    title: state.title,
    date: state.createdAt,
    description: state.description,
    imageUrls: state.imageUrls,
    evidenceID: state.evidenceID,
    templateConfig: state.templateConfig,
    statusType: {
      name: state.statusType?.name || 'Estado sin tipo',
      description: state.statusType?.description || 'Tipo de estado no disponible'
    },
    // El primer estado (más reciente) se marca como respaldado
    backed: index === 0,
    backedAt: index === 0 ? state.createdAt : undefined
  }));
}
