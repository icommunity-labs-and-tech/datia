# Variables de Entorno

## Autenticación

Tres paneles, tres cookies, dos secretos (el panel de organización reutiliza
el del superadmin — ver `src/lib/auth/organization/config.ts`).

### DASHBOARD_JWT_SECRET
- **Firma la sesión del panel de empresa** (`admin-auth-token`, `/auth/admin`).
- **Requerido en producción.** Fuera de producción cae a `JWT_SECRET` y luego a
  un valor fijo de desarrollo; en producción con ese valor fijo, la app se
  niega a arrancar.

### SUPERADMIN_JWT_SECRET
- **Firma la sesión del panel de organización** (`organization-auth-token`) y,
  fuera de producción, también la del panel de plataforma
  (`superadmin-auth-token`) — en producción esa sesión ya no existe: IAP es la
  única puerta (ver `IAP_AUDIENCE`), y el login de contraseña del panel de
  plataforma se niega a funcionar si `NODE_ENV=production`.
- **Requerido en producción**, mismo rechazo al arrancar si falta.

### IAP_AUDIENCE
- **Quién puede entrar al panel de plataforma en producción, en vez de una
  contraseña**: la cadena de audiencia (`/projects/<número>/global/backendServices/<id>`)
  que IAP firma en el JWT de cada petición que ya ha verificado, atada a un
  backend service concreto (`datia-superadmin-iap`) — un JWT firmado para otro
  recurso con IAP no vale aquí aunque sea genuino.
- **Solo se comprueba en producción** (`src/lib/auth/superadmin/identity.ts`);
  sin ella, toda petición se rechaza como no autenticada, nunca se abre en
  falso.
- Cambia solo si el backend service se recrea — su ID numérico forma parte de
  la cadena.

### JWT_SECRET
- Alternativa a `DASHBOARD_JWT_SECRET` si no se quiere un secreto por panel.
  Usado también por los tests (`src/test/setup.ts`).

### DASHBOARD_SESSION_DURATION
- **Descripción**: Duración de la sesión del panel de empresa, en segundos.
- **Valor por defecto**: `28800` (8 horas).

### DASHBOARD_RATE_LIMIT_MAX
- **Descripción**: Límite de intentos de login del panel de empresa.

## Base de datos

### DATABASE_URL
- **Requerido.** Cadena de conexión a PostgreSQL. En producción viene de
  Secret Manager (`DATIA_DATABASE_URL`), nunca en texto plano. Ver
  `docs/MIGRACIONES.md` para cómo se aplican los cambios de esquema.

## iBS (iCommunity, certificación en blockchain)

### IBS_TOKEN
- **Requerido** para KYC y certificación: crear firmas, evidencias y
  consultarlas. Sin él, esas llamadas fallan con `ICommunityConfigError`.

### IBS_BASE_URL
- **Opcional.** Por defecto `https://api.icommunitylabs.com/v2`. Solo se
  cambia en los e2e, que apuntan a un doble local
  (`tests/e2e/support/ibs-stub.mjs`) — no tocar en producción.

## Almacenamiento (Google Cloud Storage)

### GCS_BUCKET
- **Requerido** para subir imágenes (activos, branding). Sin él, esas subidas
  fallan.

### GOOGLE_CLOUD_PROJECT
- **Opcional.** Proyecto de GCP; normalmente ya lo da el propio entorno de
  Cloud Run.

## Mailgun (invitaciones por email)

### MAILGUN_API_KEY
- **Requerido** para invitar cuentas. Sin él, `inviteAccount` deshace toda la
  invitación si el envío falla.
- **Nunca pongas aquí una clave real.** Una clave de verdad estuvo
  hardcodeada en un script de certypass desde su primer commit y se filtró a
  este mismo documento; Mailgun la desactivó el 2026-10-07.

### MAILGUN_DOMAIN
- **Requerido** junto con `MAILGUN_API_KEY`.

### MAILGUN_FROM_EMAIL
- **Opcional.** Por defecto `ibs@icommunity.io`.

### MAILGUN_FROM_NAME
- **Opcional.** Por defecto `Datia`.

### MAILGUN_URL
- **Opcional.** Endpoint de Mailgun; por defecto la región EU
  (`https://api.eu.mailgun.net`). Cambiar a `https://api.mailgun.net` para US.

## Aplicación

### NEXT_PUBLIC_APP_NAME / NEXT_PUBLIC_APP_DESCRIPTION / NEXT_PUBLIC_APP_VERSION
- **Opcionales.** Nombre, descripción y versión que se muestran en la UI
  (selector de apps, títulos, metadatos). Por defecto `Datia`.

### NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_BASE_URL
- **Opcionales.** Base para construir enlaces de activación y, en el caso de
  `NEXT_PUBLIC_API_URL`, el servidor que se anuncia en la spec de la API
  pública (`/api/openapi.json`). Sin ellos, cada uno cae al origen de la
  petición.

### NEXT_PUBLIC_SESSION_DURATION
- **Opcional.** Horas de sesión que se muestran en la UI; no cambia la
  duración real, que fija `DASHBOARD_SESSION_DURATION`.

## Ejemplo de `.env.local`

```bash
DASHBOARD_JWT_SECRET="un-secreto-largo-y-aleatorio"
SUPERADMIN_JWT_SECRET="otro-secreto-largo-y-aleatorio"

DATABASE_URL="postgresql://usuario:password@localhost:5432/datia"

IBS_TOKEN="el-token-real-de-iBS"

GCS_BUCKET="mi-bucket"

MAILGUN_API_KEY="key-1234567890abcdef"
MAILGUN_DOMAIN="icommunity.io"
```
