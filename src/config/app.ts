/**
 * Configuración de la aplicación
 * Variables de entorno y configuración global
 */

export const appConfig = {
  // Nombre de la aplicación - personalizable via variable de entorno
  name: process.env.NEXT_PUBLIC_APP_NAME || 'certypass',
  
  // Descripción de la aplicación
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Sistema de Gestión Digital',
  
  // Versión de la aplicación
  version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Configuración de la aplicación
  settings: {
    // Tiempo de sesión por defecto (en horas)
    defaultSessionDuration: parseInt(process.env.NEXT_PUBLIC_SESSION_DURATION || '24'),
    
    // Habilitar modo debug
    debug: process.env.NODE_ENV === 'development',
    
    // URL base de la aplicación
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  }
};

export default appConfig;
