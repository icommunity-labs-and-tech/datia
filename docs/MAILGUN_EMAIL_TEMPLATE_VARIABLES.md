# Variables del Template de Email de Invitación

Este documento describe las variables que se utilizan en el template de email de invitación.

## Variables Disponibles en el Template

El template de email (`src/lib/effects/mailgun/templates/invitation-email.ts`) utiliza las siguientes variables:

### 1. `appName` (string)
- **Descripción**: Nombre de la aplicación
- **Valor**: `"certypass"` (hardcodeado)
- **Uso en template**:
  - Header: `¡Bienvenido a ${appName}!`
  - Mensaje: `...en ${appName}`
  - Asunto: `Invitación a ${organizationName} en ${appName}`

### 2. `recipientName` (string)
- **Descripción**: Nombre completo del usuario invitado
- **Origen**: `input.name` (desde `InviteUserInput` o `CreateOrganizationInput`)
- **Ejemplo**: `"Pablo Cumpian"`
- **Uso en template**: 
  - Saludo personalizado: `Hola <strong>${recipientName}</strong>`
  - Versión texto: `Hola ${recipientName}`

### 3. `organizationName` (string)
- **Descripción**: Nombre de la organización a la que se invita al usuario
- **Origen**: 
  - `organization.nombre` (desde la base de datos en `invite-user.ts`)
  - `result.organization.nombre` (desde la transacción en `create-organization.ts`)
- **Ejemplo**: `"iCommunity"`
- **Uso en template**:
  - Mensaje: `Has sido invitado a unirte a <strong>${organizationName}</strong> en certypass`
  - Asunto del email: `Invitación a ${organizationName} en certypass`

### 4. `activationUrl` (string)
- **Descripción**: URL completa para activar la cuenta del usuario
- **Origen**: Construida dinámicamente usando `getDynamicAppUrl()`
- **Formato**: `${appUrl}/auth/activate?token=${activationToken}`
- **Ejemplo**: `https://certypass.icommunity.io/auth/activate?token=abc123...`
- **Uso en template**:
  - Botón CTA: `<a href="${activationUrl}">Activar mi cuenta</a>`
  - Link de texto plano: `${activationUrl}`

## Construcción de la URL de Activación

La URL de activación se construye dinámicamente basándose en el host desde el que se está enviando:

```typescript
// Obtener la URL base desde el host de la request
const appUrl = await getDynamicAppUrl();
const activationUrl = `${appUrl}/auth/activate?token=${activationToken}`;
```

### Función `getDynamicAppUrl()`

Esta función (`src/lib/env.ts`) determina la URL base en el siguiente orden de prioridad:

1. **Headers de la request** (si están disponibles):
   - Usa `host` header + `x-forwarded-proto` (o `https` por defecto)
   - Ejemplo: `https://certypass.icommunity.io`

2. **Variable de entorno** `NEXT_PUBLIC_APP_URL`:
   - Si está configurada, la usa directamente
   - Ejemplo: `https://certypass.icommunity.io`

3. **Cloud Run** (si está en producción):
   - Construye la URL desde variables de entorno de Cloud Run
   - Formato: `https://${K_SERVICE}-${GOOGLE_CLOUD_PROJECT}.${region}.run.app`

4. **Fallback de desarrollo**:
   - `http://localhost:${PORT}` o `http://localhost:3000`

## Flujo de Datos

```
invite-user.ts / create-organization.ts
  ↓
getDynamicAppUrl() → Obtiene host desde headers/request
  ↓
Construye: activationUrl = `${appUrl}/auth/activate?token=${token}`
  ↓
MailgunService.sendInvitationEmail({
  recipientName: input.name,
  organizationName: organization.nombre,
  appName: 'certypass',
  activationUrl: activationUrl
})
  ↓
generateInvitationEmailHTML({ recipientName, organizationName, appName, activationUrl })
  ↓
Email HTML con variables interpoladas
```

## Ejemplo de Email Generado

Con las siguientes variables:
- `appName`: "certypass"
- `recipientName`: "Pablo Cumpian"
- `organizationName`: "iCommunity"
- `activationUrl`: "https://certypass.icommunity.io/auth/activate?token=abc123..."

El email contendrá:
- **Asunto**: "Invitación a iCommunity en certypass"
- **Header**: "¡Bienvenido a certypass!"
- **Saludo**: "Hola **Pablo Cumpian**,"
- **Mensaje**: "Has sido invitado a unirte a **iCommunity** en certypass..."
- **Botón**: Link a `https://certypass.icommunity.io/auth/activate?token=abc123...`

## Notas Importantes

1. **URL Dinámica**: La URL se construye automáticamente desde el host de la request, por lo que funcionará correctamente tanto en desarrollo (`localhost:3000`) como en producción (`certypass.icommunity.io`).

2. **Token de Activación**: El token se genera con `crypto.randomBytes(32).toString("hex")` y tiene una validez de 7 días.

3. **Variables Opcionales**: Actualmente todas las variables son requeridas. Si necesitas agregar más variables (como nombre del que invita, fecha, etc.), puedes extender la interfaz `InvitationEmailData` en `src/lib/effects/mailgun/service.ts`.

