import { appConfig } from './app';

export const operatorConfig = {
  // Configuración de la aplicación móvil
  app: {
    name: `App Operario - ${appConfig.name}`,
    version: appConfig.version,
    description: `Aplicación móvil para operarios de ${appConfig.name}`,
  },

  // Configuración del escáner QR
  scanner: {
    maxRetries: 3,
    scanTimeout: 30000, // 30 segundos
    supportedFormats: ['QR_CODE', 'CODE_128', 'CODE_39'],
    cameraPreferences: {
      facingMode: 'environment', // Cámara trasera por defecto
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  },

  // Configuración de la interfaz móvil
  ui: {
    mobile: {
      maxImageSize: 5 * 1024 * 1024, // 5MB
      maxImagesPerState: 5,
      touchTargetSize: 44, // Tamaño mínimo para elementos táctiles
      borderRadius: 8,
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
    },
    colors: {
      primary: '#667eea',
      secondary: '#764ba2',
      success: '#198754',
      danger: '#dc3545',
      warning: '#ffc107',
      info: '#0dcaf0',
      light: '#f8f9fa',
      dark: '#212529',
    },
  },

  // Configuración de la API
  api: {
    endpoints: {
      searchItems: '/api/items/search',
      getItem: '/api/items',
      createState: '/api/states',
      uploadImage: '/api/upload',
    },
    timeout: 10000, // 10 segundos
    retryAttempts: 2,
  },

  // Configuración de notificaciones
  notifications: {
    success: {
      stateCreated: 'Estado creado exitosamente',
      itemFound: 'Item encontrado',
    },
    error: {
      itemNotFound: 'Item no encontrado',
      networkError: 'Error de conexión',
      cameraError: 'Error al acceder a la cámara',
      uploadError: 'Error al subir imagen',
    },
    info: {
      scanning: 'Escaneando código QR...',
      uploading: 'Subiendo imagen...',
      processing: 'Procesando...',
    },
  },

  // Configuración de validación
  validation: {
    state: {
      title: {
        minLength: 3,
        maxLength: 100,
        required: true,
      },
      description: {
        maxLength: 500,
        required: false,
      },
      images: {
        maxCount: 5,
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      },
    },
  },

  // Configuración de accesibilidad
  accessibility: {
    screenReader: {
      enabled: true,
      announcements: {
        scanStart: 'Escáner iniciado',
        scanSuccess: 'Código escaneado exitosamente',
        scanError: 'Error al escanear',
      },
    },
    keyboard: {
      enabled: true,
      shortcuts: {
        scan: 'Space',
        close: 'Escape',
        submit: 'Enter',
      },
    },
  },
};

export default operatorConfig;
