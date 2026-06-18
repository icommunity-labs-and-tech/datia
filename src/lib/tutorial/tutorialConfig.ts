import type { TutorialStep } from './types';
import { TOUR_IDS } from './types';

// Re-exportar TOUR_IDS para facilitar el uso
export { TOUR_IDS };

/**
 * Tour del Sidebar - Explica los diferentes apartados del menú de navegación
 * Se muestra automáticamente en la primera visita al dashboard
 */
export const sidebarTour: TutorialStep[] = [
  // Paso 0 – Bienvenida al sidebar
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: 'Bienvenido a Datia',
      description: 'Este es el menú principal de navegación. Te guiaremos por las diferentes secciones disponibles.',
      side: 'right',
      align: 'start',
    },
  },
  // Paso 1 – Inicio
  {
    element: '[data-tour="sidebar"] .nav-link[href="/dashboard"]',
    popover: {
      title: 'Inicio',
      description: 'El dashboard principal donde verás un resumen de tus métricas, gráficos de actividad y estadísticas generales de tu organización.',
      side: 'right',
      align: 'start',
    },
  },
  // Paso 2 – Link Estados (navega a /dashboard/status-types)
  {
    element: '[data-tour="sidebar"] .nav-link[href="/dashboard/status-types"]',
    popover: {
      title: 'Estados',
      description: 'Desde aquí accedes a los tipos de estado. Vamos a abrir esta sección para que veas cómo funciona.',
      side: 'right',
      align: 'start',
    },
  },
  // Paso 3 – Tabla de Estados (ya en /dashboard/status-types)
  {
    element: '[data-tour="status-types-table"]',
    popover: {
      title: 'Tabla de Estados',
      description: 'Cada fila es un tipo de estado que representa una etapa en el ciclo de vida de tus productos. Hemos cargado ejemplos para tu sector: observa cómo cada estado tiene nombre, descripción y campos personalizados que se rellenarán al registrar esa fase (fechas, responsables, resultados…). Puedes crear los tuyos propios desde el botón superior.',
      side: 'top',
      align: 'center',
    },
  },
  // Paso 4 – Link Productos (navega a /dashboard/items)
  {
    element: '[data-tour="sidebar"] .nav-link[href="/dashboard/items"]',
    popover: {
      title: 'Productos',
      description: 'Ahora vamos a la sección de productos para ver tu inventario.',
      side: 'right',
      align: 'start',
    },
  },
  // Paso 5 – Tabla de Productos (ya en /dashboard/items)
  {
    element: '[data-tour="items-table"]',
    popover: {
      title: 'Inventario de Productos',
      description: 'Aquí se muestra tu inventario completo. Cada producto tiene un nombre, categorías asignadas y fecha de creación. Los ejemplos que ves son orientativos para tu sector. Cuando crees productos reales, podrás asignarles estados, generar su pasaporte digital y compartirlo mediante código QR.',
      side: 'top',
      align: 'center',
    },
  },
  // Paso 6 – Usuarios (navega de vuelta a /dashboard)
  {
    element: '[data-tour="sidebar"] .nav-link[href="/dashboard/users"]',
    popover: {
      title: 'Usuarios',
      description: 'Gestiona los usuarios de tu organización. Invita nuevos miembros y asigna roles (Administrador u Operador) y permisos.',
      side: 'right',
      align: 'start',
    },
  },
  // Paso 7 – Perfil
  {
    element: '[data-tour="sidebar"] a[href="/dashboard/profile"]',
    popover: {
      title: 'Perfil',
      description: 'Actualiza tu información personal y gestiona la verificación de identidad (KYC) de tu organización.',
      side: 'right',
      align: 'start',
    },
  },
  // Paso 8 – Desarrollador
  {
    element: '[data-tour="developer-section"]',
    popover: {
      title: 'Desarrollador',
      description: 'Herramientas para desarrolladores: tokens de API para autenticación, eventos del sistema, webhooks para notificaciones y documentación de la API REST.',
      side: 'right',
      align: 'start',
    },
  },
  // Paso 9 – Aplicaciones
  {
    element: '[data-tour="applications-section"]',
    popover: {
      title: 'Aplicaciones',
      description: 'Acceso rápido a la aplicación Cliente (para verificar productos con QR) y la aplicación Operador (para gestionar productos en campo).',
      side: 'right',
      align: 'start',
    },
  },
];

/**
 * Mapa de navegación por índice de paso del sidebar tour.
 * Cuando el tour avanza a un paso con navegación, se ejecuta router.push antes de mostrar el popover.
 */
export const sidebarTourNavigation: Record<number, string> = {
  2: '/dashboard/status-types',  // Paso 2 "Estados" → abrir página de status-types
  4: '/dashboard/items',         // Paso 4 "Productos" → abrir página de items
  6: '/dashboard',               // Paso 6 "Usuarios" → volver al dashboard
};

/**
 * Configuración de tours disponibles
 */
export const tourConfigs = {
  [TOUR_IDS.SIDEBAR_TOUR]: {
    title: 'Tour del Menú',
    description: 'Conoce las secciones principales del sistema',
    steps: sidebarTour,
  },
} as const;
