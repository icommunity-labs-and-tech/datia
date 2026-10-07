# Datia

Certificación de activos y de sus emisiones de CO₂ en blockchain, para
organizaciones con varias empresas. Construido con Next.js, TypeScript y
Prisma, sobre arquitectura hexagonal.

Para comandos, capas y convenciones de código, ver [`CLAUDE.md`](./CLAUDE.md)
— esta guía es para orientarse, no para repetir lo que ya está ahí.

## Qué certifica

Un **activo** (`Asset`) pertenece a una empresa. Puede tener una o varias
**fuentes de energía** (`EnergySource`), cada una con sus **consumos**
(`EnergyConsumption`) y los **registros de emisión** (`EmissionRecord`)
calculados a partir de ellos. Una emisión se ancla en blockchain a través de
**iCommunity iBS** al escribirse — sin esperar a una llamada aparte — y queda
verificable: ver [`docs/CERTIFICACION_AUTOMATICA.md`](./docs/CERTIFICACION_AUTOMATICA.md)
y [`docs/EVIDENCE_AUDIT_MODEL.md`](./docs/EVIDENCE_AUDIT_MODEL.md).

## Multi-tenancy: organización y empresa

```
Organization
└── Company (una o varias)
    └── Asset, User, ApiToken, ...
```

Una cuenta pertenece a una **organización** y, si opera dentro de una
empresa concreta, también a una **empresa** (`companyId`). La que no tiene
empresa —la cuenta de la organización— ve el conjunto de sus empresas; la que
sí la tiene, solo la suya. Toda consulta de dominio se filtra por `Scope`
(`src/lib/scope.ts`): `{ organizationId, companyId }`.

### Roles

- **`ADMIN`** — cuenta de una empresa. Gestiona sus activos, su energía y sus
  certificaciones.
- **`ORG_ADMIN`** — la cuenta de la organización. No pertenece a ninguna
  empresa; ve y gestiona el conjunto.
- **`SUPER_ADMIN`** — plataforma. Ve todas las organizaciones.

## Los tres paneles

| Quién | Ruta | Login | Cookie |
|---|---|---|---|
| Empresa | `/dashboard` | `/auth/admin/login` | `admin-auth-token` |
| Organización | `/organization` | `/auth/organization/login` | `organization-auth-token` |
| Plataforma | `/superadmin` | `/auth/superadmin/login` | `superadmin-auth-token` |

Tres JWT separados: el panel de empresa firma con `DASHBOARD_JWT_SECRET`; el
de plataforma y el de organización comparten `SUPERADMIN_JWT_SECRET` (son
sesiones propias igualmente, con audiencia distinta — ver
`src/lib/auth/organization/config.ts`). Detalle completo en
[`docs/ENVIRONMENT_VARIABLES.md`](./docs/ENVIRONMENT_VARIABLES.md).

## API pública

Cada empresa puede ingerir sus propios datos (activos, energía, emisiones) vía
`POST`/`GET` en `/api/v1/*`, autenticada con un token de empresa o de
organización (`ApiToken`). La referencia interactiva está en `/api/v1/docs`
(Scalar), servida desde `src/app/api/openapi.json/route.ts` — ese fichero es
la única fuente de la spec, no se genera desde comentarios JSDoc.

## Estructura del proyecto

```
src/
├── domain/           # Lógica de negocio pura: interfaces de repositorio,
│                      # servicios (createXxxServiceImpl), errores tipados (_tag)
├── infrastructure/   # Implementaciones Prisma, cliente de iBS, GCS
├── actions/          # Server Actions: orquestan el dominio, sin lógica propia
├── components/       # React (Mantine)
├── app/              # Next.js App Router — dashboard, organization,
│                      # superadmin, api/v1, auth
└── lib/               # Scope, auth, servicios compartidos
```

Convenciones completas (inyección de dependencias, dónde va cada tipo de
código, qué no se importa desde dónde) en [`CLAUDE.md`](./CLAUDE.md).

## Desarrollo

```bash
npm ci --legacy-peer-deps   # necesario: ver el comentario en ci.yml
cp .env.example .env.local  # si existe; si no, ver docs/ENVIRONMENT_VARIABLES.md
npx prisma generate
npx prisma migrate dev      # solo contra una base de desarrollo
npm run dev
```

`npm run db:push` no existe aquí a propósito: las migraciones de producción se
aplican a mano siguiendo [`docs/MIGRACIONES.md`](./docs/MIGRACIONES.md), nunca
`db push`.

## Testing

```bash
npm test                 # Vitest
npm test -- --coverage   # con el umbral real que aplica CI
npm run test:e2e         # Playwright contra SQLite (ver tests/e2e/README.md)
```

Los e2e certifican una emisión de extremo a extremo contra un doble local de
iBS (`tests/e2e/support/ibs-stub.mjs`), no contra el servicio real.

## Más documentación

Ver [`docs/README.md`](./docs/README.md) para el índice completo, incluidos
los documentos archivados de fases anteriores del producto.
