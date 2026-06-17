import type { TutorialState, TourId } from './types';

const STORAGE_KEY = 'certypass_tutorial_state';

/**
 * Obtiene el estado actual de los tutoriales desde localStorage
 */
export function getTutorialState(): TutorialState {
  if (typeof window === 'undefined') {
    return { completedTours: [], lastShown: {} };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as TutorialState;
    }
  } catch (error) {
    console.error('Error reading tutorial state from localStorage:', error);
  }

  return { completedTours: [], lastShown: {} };
}

/**
 * Guarda el estado de los tutoriales en localStorage
 */
function saveTutorialState(state: TutorialState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving tutorial state to localStorage:', error);
  }
}

/**
 * Marca un tour como completado
 */
export function markTourAsCompleted(tourId: TourId): void {
  const state = getTutorialState();
  
  if (!state.completedTours.includes(tourId)) {
    state.completedTours.push(tourId);
  }
  
  state.lastShown[tourId] = Date.now();
  saveTutorialState(state);
}

/**
 * Verifica si un tour debe mostrarse (si no ha sido completado)
 */
export function shouldShowTour(tourId: TourId): boolean {
  const state = getTutorialState();
  return !state.completedTours.includes(tourId);
}

/**
 * Resetea un tour específico (lo marca como no completado)
 */
export function resetTour(tourId: TourId): void {
  const state = getTutorialState();
  state.completedTours = state.completedTours.filter(id => id !== tourId);
  delete state.lastShown[tourId];
  saveTutorialState(state);
}

/**
 * Resetea todos los tours
 */
export function resetAllTours(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error resetting all tutorials:', error);
  }
}

/**
 * Obtiene la lista de tours completados
 */
export function getCompletedTours(): TourId[] {
  return getTutorialState().completedTours;
}
