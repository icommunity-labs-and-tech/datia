import type { DriveStep, Config } from 'driver.js';

/**
 * ID único para cada tour disponible en la aplicación
 */
export const TOUR_IDS = {
  SIDEBAR_TOUR: 'sidebar-tour',
} as const;

export type TourId = typeof TOUR_IDS[keyof typeof TOUR_IDS];

/**
 * Estado del tutorial almacenado en localStorage
 */
export interface TutorialState {
  completedTours: TourId[];
  lastShown: Partial<Record<TourId, number>>;
}

/**
 * Paso de un tour (extiende el tipo de Driver.js)
 */
export type TutorialStep = DriveStep;

/**
 * Configuración de un tour completo
 */
export interface TourConfig {
  id: TourId;
  title: string;
  description?: string;
  steps: TutorialStep[];
}

/**
 * Valor del contexto de tutorial
 */
export interface TutorialContextValue {
  /**
   * Inicia un tour específico
   */
  startTour: (tourId: TourId, steps: DriveStep[], config?: Partial<Config>) => void | Promise<void>;
  /**
   * Verifica si un tour ha sido completado
   */
  isCompleted: (tourId: TourId) => boolean;
  /**
   * Resetea un tour específico (lo marca como no completado)
   */
  resetTour: (tourId: TourId) => void;
  /**
   * Resetea todos los tours
   */
  resetAllTours: () => void;
  /**
   * Obtiene la lista de tours completados
   */
  getCompletedTours: () => TourId[];
  /**
   * Indica si hay un tour activo en este momento
   */
  isTourActive: boolean;
  /**
   * Slug del sector de la organización (disponible durante el tour)
   */
  organizationSector: string | null;
}
