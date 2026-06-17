'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tutorial.css';
import type { DriveStep, Config } from 'driver.js';
import type { TutorialContextValue, TourId } from './types';
import {
  markTourAsCompleted,
  shouldShowTour,
  resetTour as resetTourStorage,
  resetAllTours as resetAllToursStorage,
  getCompletedTours as getCompletedToursStorage,
} from './tutorialStorage';
import { sidebarTourNavigation } from './tutorialConfig';
import { getOrganizationSector } from '@/actions/sectors';

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

interface TutorialProviderProps {
  children: React.ReactNode;
}

/**
 * Configuración global de Driver.js
 */
const defaultDriverConfig: Partial<Config> = {
  showProgress: true,
  showButtons: ['next', 'close'],
  nextBtnText: 'Siguiente',
  prevBtnText: 'Anterior',
  doneBtnText: 'Finalizar',
  progressText: '{{current}} de {{total}}',
  smoothScroll: true,
  animate: true,
  allowClose: true,
  overlayOpacity: 0.6,
  stagePadding: 6,
  stageRadius: 12,
  popoverClass: 'certypass-tutorial-popover',
  popoverOffset: 10,
};

export function TutorialProvider({ children }: TutorialProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const driverInstanceRef = useRef<ReturnType<typeof driver> | null>(null);
  const currentTourIdRef = useRef<TourId | null>(null);
  const [completedTours, setCompletedTours] = useState<TourId[]>(() => getCompletedToursStorage());
  const [isTourActive, setIsTourActive] = useState(false);
  const [organizationSector, setOrganizationSector] = useState<string | null>(null);

  // Ref para evitar marcar el tour como completado múltiples veces
  const hasMarkedCompletedRef = useRef(false);
  // Ref para saber si estamos en medio de una navegación
  const isNavigatingRef = useRef(false);
  // Ref para guardar el pathname al que queremos navegar
  const pendingNavigationRef = useRef<string | null>(null);
  // Refs para usar valores actuales dentro de callbacks sin re-crear el driver
  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  pathnameRef.current = pathname;
  routerRef.current = router;

  // Función para marcar el tour como completado
  const markTourCompleted = useCallback((tourId: TourId | null) => {
    if (tourId && !hasMarkedCompletedRef.current) {
      hasMarkedCompletedRef.current = true;
      markTourAsCompleted(tourId);
      setCompletedTours(prev => {
        if (!prev.includes(tourId)) {
          return [...prev, tourId];
        }
        return prev;
      });
    }
  }, []);

  // Función para finalizar el tour (limpiar estado)
  const finishTour = useCallback(() => {
    setIsTourActive(false);
    setOrganizationSector(null);
    isNavigatingRef.current = false;
    pendingNavigationRef.current = null;
    document.body.classList.remove('tutorial-navigating');
  }, []);

  // Detectar cuando la navegación se completa para avanzar el paso del tour
  useEffect(() => {
    if (isNavigatingRef.current && pendingNavigationRef.current && pathname === pendingNavigationRef.current) {
      isNavigatingRef.current = false;
      pendingNavigationRef.current = null;
      // Dar tiempo al DOM para renderizar antes de avanzar el paso
      setTimeout(() => {
        if (driverInstanceRef.current?.isActive()) {
          driverInstanceRef.current.moveNext();
        }
        // Restaurar visibilidad del overlay tras avanzar el paso
        document.body.classList.remove('tutorial-navigating');
      }, 400);
    }
  }, [pathname]);

  // Inicializar Driver.js solo en el cliente
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const driverInstance = driver({
      ...defaultDriverConfig,
      onCloseClick: () => {
        // Usuario hizo clic en el botón de cerrar (X)
        const tourId = currentTourIdRef.current;
        markTourCompleted(tourId);
        if (driverInstance.isActive()) {
          driverInstance.destroy();
        }
      },
      onNextClick: () => {
        // Verificar si es el último paso ANTES de hacer cualquier acción
        if (driverInstance.isLastStep()) {
          // Usuario hizo clic en "Finalizar"
          const tourId = currentTourIdRef.current;
          markTourCompleted(tourId);
          if (driverInstance.isActive()) {
            driverInstance.destroy();
          }
        } else {
          // Comprobar si el siguiente paso necesita navegación
          const currentIndex = driverInstance.getActiveIndex();
          if (currentIndex !== undefined) {
            const nextIndex = currentIndex + 1;
            const navPath = sidebarTourNavigation[nextIndex];
            if (navPath && pathnameRef.current !== navPath) {
              // Ocultar el overlay mientras se navega para evitar el salto visual
              document.body.classList.add('tutorial-navigating');
              // Navegar a la ruta y esperar a que se complete
              isNavigatingRef.current = true;
              pendingNavigationRef.current = navPath;
              routerRef.current.push(navPath);
              // No llamamos moveNext() aquí; se hará cuando el pathname cambie
              return;
            }
          }
          // Sin navegación necesaria, avanzar normalmente
          driverInstance.moveNext();
        }
      },
      onDestroyed: () => {
        // Limpiar refs cuando el tour se destruye
        currentTourIdRef.current = null;
        hasMarkedCompletedRef.current = false;
        finishTour();
      },
    });

    driverInstanceRef.current = driverInstance;

    return () => {
      if (driverInstanceRef.current) {
        driverInstanceRef.current.destroy();
      }
    };
  }, [markTourCompleted, finishTour]);

  const startTour = useCallback(
    async (tourId: TourId, steps: DriveStep[], config?: Partial<Config>) => {
      if (!driverInstanceRef.current) {
        console.warn('Driver.js not initialized yet');
        return;
      }

      // Verificar si el tour ya fue completado (a menos que se fuerce con config.allowClose)
      if (!config?.allowClose && !shouldShowTour(tourId)) {
        return;
      }

      // Resetear el flag de completado para el nuevo tour
      hasMarkedCompletedRef.current = false;

      // Guardar el tourId actual para poder trackearlo cuando se destruya
      currentTourIdRef.current = tourId;

      // Marcar el tour como activo ANTES de cualquier llamada async
      setIsTourActive(true);

      // Obtener el sector de la organización para datos de ejemplo
      const result = await getOrganizationSector();
      setOrganizationSector(result.sectorSlug);

      // No filtramos pasos por existencia en el DOM: algunos elementos están
      // en páginas a las que se navegará durante el tour (la navegación ocurre
      // antes de mostrar el paso, así que el elemento existirá cuando se necesite).

      if (steps.length === 0) {
        console.warn(`Tutorial "${tourId}" has no steps`);
        setIsTourActive(false);
        return;
      }

      // Asegurar que cada paso tenga los botones habilitados
      const stepsWithButtons = steps.map((step) => ({
        ...step,
        popover: {
          ...step.popover,
          showButtons: step.popover?.showButtons || ['next', 'close'],
        },
      }));

      // Iniciar el tour
      driverInstanceRef.current.setSteps(stepsWithButtons);
      driverInstanceRef.current.drive();
    },
    []
  );

  const isCompleted = useCallback((tourId: TourId): boolean => {
    return completedTours.includes(tourId);
  }, [completedTours]);

  const resetTour = useCallback((tourId: TourId): void => {
    resetTourStorage(tourId);
    setCompletedTours(prev => prev.filter(id => id !== tourId));
  }, []);

  const resetAllTours = useCallback((): void => {
    resetAllToursStorage();
    setCompletedTours([]);
  }, []);

  const getCompletedTours = useCallback((): TourId[] => {
    return completedTours;
  }, [completedTours]);

  const value: TutorialContextValue = {
    startTour,
    isCompleted,
    resetTour,
    resetAllTours,
    getCompletedTours,
    isTourActive,
    organizationSector,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

/**
 * Hook para acceder al contexto de tutorial
 */
export function useTutorialContext(): TutorialContextValue {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorialContext must be used within a TutorialProvider');
  }
  return context;
}
