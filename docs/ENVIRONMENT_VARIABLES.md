# Variables de Entorno

Este documento describe las variables de entorno disponibles para personalizar la aplicación.

## Configuración de la Aplicación

### NEXT_PUBLIC_APP_NAME
- **Descripción**: Nombre de la aplicación que se mostrará en la interfaz
- **Valor por defecto**: "Datia"
- **Ejemplo**: `NEXT_PUBLIC_APP_NAME="Mi Empresa"`

### NEXT_PUBLIC_APP_DESCRIPTION
- **Descripción**: Descripción de la aplicación
- **Valor por defecto**: "Sistema de Gestión Digital"
- **Ejemplo**: `NEXT_PUBLIC_APP_DESCRIPTION="Sistema de Inventario"`

### NEXT_PUBLIC_APP_VERSION
- **Descripción**: Versión de la aplicación
- **Valor por defecto**: "1.0.0"
- **Ejemplo**: `NEXT_PUBLIC_APP_VERSION="2.1.0"`

### NEXT_PUBLIC_SESSION_DURATION
- **Descripción**: Duración de la sesión en horas
- **Valor por defecto**: "24"
- **Ejemplo**: `NEXT_PUBLIC_SESSION_DURATION="8"`

### NEXT_PUBLIC_BASE_URL
- **Descripción**: URL base de la aplicación
- **Valor por defecto**: "http://localhost:3000"
- **Ejemplo**: `NEXT_PUBLIC_BASE_URL="https://miapp.com"`

## Configuración de Autenticación

### DASHBOARD_JWT_SECRET
- **Descripción**: Secreto JWT para el dashboard de administración
- **Requerido**: Sí
- **Ejemplo**: `DASHBOARD_JWT_SECRET="mi-secreto-super-seguro-123"`

### OPERATOR_JWT_SECRET
- **Descripción**: Secreto JWT para la aplicación de operador
- **Requerido**: Sí
- **Ejemplo**: `OPERATOR_JWT_SECRET="otro-secreto-super-seguro-456"`

## Configuración de Base de Datos

### DATABASE_URL
- **Descripción**: URL de conexión a la base de datos PostgreSQL
- **Requerido**: Sí
- **Ejemplo**: `DATABASE_URL="postgresql://usuario:password@localhost:5432/datia"`

## Configuración de Mailgun (Emails)

### MAILGUN_API_KEY
- **Descripción**: API key de Mailgun para enviar emails
- **Requerido**: Sí (para funcionalidad de invitaciones)
- **Ejemplo**: `MAILGUN_API_KEY="key-1234567890abcdef"`

### MAILGUN_DOMAIN
- **Descripción**: Dominio verificado en Mailgun
- **Requerido**: Sí (para funcionalidad de invitaciones)
- **Ejemplo**: `MAILGUN_DOMAIN="icommunity.io"`

### MAILGUN_FROM_EMAIL
- **Descripción**: Email remitente para los correos enviados
- **Requerido**: No (por defecto: `ibs@icommunity.io`)
- **Ejemplo**: `MAILGUN_FROM_EMAIL="ibs@icommunity.io"`

### MAILGUN_FROM_NAME
- **Descripción**: Nombre del remitente que aparecerá en los emails
- **Requerido**: No (por defecto: `Datia`)
- **Ejemplo**: `MAILGUN_FROM_NAME="Mi Empresa"`

### NEXT_PUBLIC_APP_URL
- **Descripción**: URL base de la aplicación para construir links de activación
- **Requerido**: No (por defecto: `http://localhost:3000`)
- **Ejemplo**: `NEXT_PUBLIC_APP_URL="https://miapp.com"`

### MAILGUN_URL
- **Descripción**: URL del endpoint de Mailgun (US o EU)
- **Requerido**: No (por defecto: `https://api.eu.mailgun.net` para región EU)
- **Ejemplo**: `MAILGUN_URL="https://api.mailgun.net"` (para región US)

## Ejemplo de archivo .env.local

```bash
# Configuración de la aplicación
NEXT_PUBLIC_APP_NAME="Mi Empresa"
NEXT_PUBLIC_APP_DESCRIPTION="Sistema de Inventario"
NEXT_PUBLIC_APP_VERSION="2.1.0"
NEXT_PUBLIC_SESSION_DURATION="8"
NEXT_PUBLIC_BASE_URL="https://miapp.com"

# Configuración de autenticación
DASHBOARD_JWT_SECRET="mi-secreto-dashboard-123"
OPERATOR_JWT_SECRET="mi-secreto-operator-456"

# Configuración de base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/miapp"

# Configuración de Mailgun (emails)
MAILGUN_API_KEY="fc97eb228d0246cd94daff9d3cc63759-826eddfb-affbba41"
MAILGUN_DOMAIN="icommunity.io"
MAILGUN_FROM_EMAIL="ibs@icommunity.io"
MAILGUN_FROM_NAME="Datia"
NEXT_PUBLIC_APP_URL="https://miapp.com"
```

## Personalización

Para personalizar la aplicación para tu empresa:

1. Crea un archivo `.env.local` en la raíz del proyecto
2. Copia las variables necesarias del ejemplo anterior
3. Cambia los valores según tus necesidades
4. Reinicia la aplicación para que los cambios surtan efecto

El nombre de la aplicación aparecerá en:
- La página de selector de aplicaciones (/apps)
- Los títulos de las páginas
- Los metadatos del sitio
