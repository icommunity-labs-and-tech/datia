# certypass - Sistema de Gestión Multi-Tenant

Sistema de gestión de items con arquitectura multi-tenant, construido con Next.js, TypeScript y Prisma.

## 📋 Tabla de Contenidos

- [Arquitectura](#-arquitectura)
- [Multi-Tenancy](#-multi-tenancy)
- [Autenticación](#-autenticación)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Guías de Uso](#-guías-de-uso)
- [Testing](#-testing)
- [Desarrollo](#-desarrollo)

---

## 🏗️ Arquitectura

### Principios de Diseño

Este proyecto sigue una arquitectura de **Puertos y Adaptadores** (Hexagonal) con:

1. **Domain-Driven Design (DDD)**
   - Capa de dominio con lógica de negocio pura
   - Capa de infraestructura para servicios externos
   - Capa de acciones para orquestación

2. **Async/Await con TypeScript**
   - Manejo de errores type-safe con clases ES6
   - Dependency injection manual con factory functions
   - Código asíncrono directo y fácil de entender
   - Retry y timeout manuales donde sea necesario

3. **Repository Pattern**
   - Abstracción completa de Prisma
   - Interfaces de dominio simples
   - Implementaciones en la capa de infraestructura

### Estructura del Proyecto

```
src/
├── domain/                    # Lógica de negocio pura
│   ├── categories/           # Gestión de categorías
│   ├── items/                # Gestión de items
│   ├── states/               # Gestión de estados
│   ├── users/                # Gestión de usuarios
│   ├── statusTypes/          # Tipos de estado
│   └── dashboard/            # Servicios de dashboard
├── infrastructure/           # Servicios externos e infraestructura
│   ├── prisma/              # Implementaciones de repositorios
│   │   └── repositories/    # Repositorios con Prisma
│   ├── icommunity/          # Cliente API iCommunity
│   └── storage/             # Almacenamiento (Google Cloud Storage)
├── actions/                 # Next.js server actions (orquestación)
│   ├── categories/          # Operaciones de categorías
│   ├── items/               # Operaciones de items
│   ├── states/              # Operaciones de estados
│   ├── users/               # Operaciones de usuarios
│   ├── organizations/       # Operaciones de organizaciones
│   └── dashboard/           # Operaciones de dashboard
├── lib/                     # Utilidades y configuraciones compartidas
│   ├── auth/               # Sistema de autenticación JWT
│   ├── services/           # Servicios externos (async/await)
│   └── auth/               # Helpers de autenticación
├── components/              # Componentes React
├── app/                     # Next.js app router pages
└── test/                    # Utilidades de testing
    ├── fixtures/           # Factorías de datos de prueba
    └── mocks/              # Mocks centralizados
```

### Capas y Responsabilidades

#### Domain Layer (`src/domain/`)
- **Lógica de negocio** pura, sin dependencias externas
- **Servicios de dominio** con factory functions (`createXxxServiceImpl`)
- **Interfaces de repositorios** simples
- **Errores de dominio** tipados (clases ES6 con `_tag`)
- **Validación de reglas de negocio**

#### Infrastructure Layer (`src/infrastructure/`)
- **Clientes de API externos** (iCommunity, Google Cloud)
- **Acceso a base de datos** (implementaciones de repositorios)
- **Gestión de configuración**
- **Operaciones de red** con retry/timeout

#### Actions Layer (`src/actions/`)
- **Next.js server actions**
- **Validación de input** y parsing
- **Orquestación de servicios de dominio**
- **Mapeo de errores** a mensajes de usuario
- **Inyección de dependencias** manual con factory functions

---

## 🏢 Multi-Tenancy

### Descripción General

El sistema implementa **multi-tenancy a nivel de organización**, permitiendo que múltiples clientes/organizaciones utilicen la aplicación con **aislamiento completo de datos**.

### Modelo de Datos

#### Organización (`Organization`)
```prisma
model Organization {
  id              String   @id @default(cuid())
  nombre          String
  slug            String   @unique
  plan            String   @default("free")
  maxUsuarios     Int      @default(10)
  maxItems        Int      @default(1000)
  configuracion   Json?
  creadoEn        DateTime @default(now())
  actualizadoEn   DateTime @updatedAt
  
  // Relaciones
  users           User[]
  categories      Category[]
  items           Item[]
  invitations     Invitation[]
}
```

#### Roles de Usuario
- **SUPER_ADMIN**: Gestiona todo el sistema, crea organizaciones
- **ADMIN**: Gestiona su organización, invita usuarios
- **USER**: Operador que gestiona items de su organización

#### Estados de Usuario
- **PENDING**: Usuario invitado, esperando activación
- **ACTIVE**: Usuario activo, puede iniciar sesión
- **SUSPENDED**: Usuario suspendido, no puede acceder

### Helpers de Tenant

Helpers para obtener el contexto del tenant actual:

```typescript
import { requireOrganizationId, getCurrentTenant } from "@/lib/auth/tenant";

// Obtener organizationId del contexto actual
const organizationId = await requireOrganizationId();

// Obtener información completa del tenant
const tenant = await getCurrentTenant();
console.log(tenant.organizationId, tenant.userRole);
```

### Patrón de Repositorios Multi-Tenant

Todos los repositorios deben implementar métodos que filtren por `organizationId`:

```typescript
export interface ItemRepository {
  // Para usuarios de organización
  findByOrganization(organizationId: string): Promise<Item[]>;
  getById(id: string, organizationId: string): Promise<Item | null>;
  
  // Para SUPER_ADMIN (ve todos)
  findAll(): Promise<Item[]>;
}
```

### Ejemplo de Server Action Multi-Tenant

```typescript
"use server";

import { requireOrganizationId } from "@/lib/auth/tenant";
import { createItemServiceImpl } from "@/domain/items/ItemServiceImpl";
import { itemRepository } from "@/infrastructure/prisma/repositories/ItemRepositoryPrisma";

export async function getMyItems() {
  // Obtener organizationId del contexto
  const organizationId = await requireOrganizationId();
  
  // Crear servicio con dependencias
  const itemService = createItemServiceImpl({
    itemRepository,
    userRepository,
    evidenceService,
  });
  
  // Usar el servicio directamente
  return await itemService.listItems({ organizationId });
}
```

### Seguridad Multi-Tenant

- ✅ JWT incluye `organizationId` y `role`
- ✅ Todos los queries filtran automáticamente por organización
- ✅ Helpers de tenant validan contexto en cada request
- ✅ SUPER_ADMIN puede acceder a todas las organizaciones
- ✅ ADMIN solo ve su organización
- ✅ USER solo ve recursos de su organización

---

## 🔐 Autenticación

### Sistema JWT Separado por Roles

El sistema utiliza autenticación JWT separada para diferentes roles:

#### Contextos de Autenticación
- **Admin Dashboard** → `/auth/admin/login` → `/dashboard`
- **Operator App** → `/auth/operator/login` → `/operator`
- **Super Admin** → `/auth/superadmin/login` → `/superadmin`

#### Configuración de Tokens
- **Admin JWT**: `DASHBOARD_JWT_SECRET` → Cookie: `admin-auth-token`
- **Operator JWT**: `OPERATOR_JWT_SECRET` → Cookie: `operator-auth-token`
- **Super Admin JWT**: `SUPERADMIN_JWT_SECRET` → Cookie: `superadmin-auth-token`

#### JWT Payload
```typescript
{
  userId: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  organizationId?: string; // null para SUPER_ADMIN
  iat: number;
  exp: number;
}
```

### Estructura de Autenticación

```
src/lib/auth/
├── admin/                # Autenticación Admin
│   ├── config.ts        # Configuración JWT
│   ├── jwt.ts           # Firma y verificación
│   └── login.ts         # Lógica de login
├── operator/            # Autenticación Operator
│   ├── config.ts
│   ├── jwt.ts
│   └── login.ts
├── superadmin/          # Autenticación Super Admin
│   ├── config.ts
│   ├── jwt.ts
│   └── login.ts
└── shared/              # Utilidades compartidas
    └── utils.ts
```

### Variables de Entorno

```bash
# Autenticación JWT
DASHBOARD_JWT_SECRET="your-admin-secret-key"
OPERATOR_JWT_SECRET="your-operator-secret-key"
SUPERADMIN_JWT_SECRET="your-superadmin-secret-key"

# Base de datos
DATABASE_URL="postgresql://..."

# iCommunity API
ICOMMUNITY_API_BASE_URL="https://api.icommunity.io"
ICOMMUNITY_API_KEY="your-api-key"
ICOMMUNITY_CLIENT_ID="your-client-id"

# Google Cloud Storage
GCS_BUCKET_NAME="your-bucket-name"
GCS_PROJECT_ID="your-project-id"
```

---

## 🎯 Guías de Uso

### 1. Crear una Nueva Organización (SUPER_ADMIN)

#### Paso 1: Acceder al Panel Super Admin
1. Inicia sesión como SUPER_ADMIN en `/auth/superadmin/login`
2. Ve a `/superadmin/organizations`
3. Clic en "Nueva Organización"

#### Paso 2: Completar el Formulario

**Datos de la Organización:**
- **Nombre**: Nombre completo de la empresa (ej: "Acme Corporation")
- **Slug**: Identificador único URL-friendly (ej: "acme-corporation")
  - Solo minúsculas, números y guiones
  - Se genera automáticamente pero es editable

**Datos del Primer Administrador:**
- **Nombre**: Nombre completo del administrador
- **Email**: Email único (se usará para login)
- **Teléfono** (opcional): Para verificación KYC

#### Paso 3: Obtener Link de Activación

El sistema generará un link como:
```
http://localhost:3000/auth/activate?token=abc123def456...
```

**Importante:** Copia y envía este link al administrador por email/WhatsApp.

#### Paso 4: El Administrador Activa su Cuenta

1. El admin hace clic en el link
2. Establece su contraseña
3. Confirma la contraseña
4. Clic en "Activar cuenta"
5. Ya puede iniciar sesión en `/auth/admin/login`

### 2. Invitar Usuarios a una Organización (ADMIN)

#### Desde el Panel de Usuarios
1. Inicia sesión como ADMIN
2. Ve a `/dashboard/users`
3. Clic en "Añadir Usuario"
4. Completa: nombre, email, rol (USER o ADMIN)
5. Copia el link de activación generado
6. Envíalo al usuario

El usuario sigue el mismo proceso de activación que el administrador.

### 3. Roles y Permisos

| Ruta                        | USER | ADMIN | SUPER_ADMIN |
|-----------------------------|------|-------|-------------|
| `/dashboard`                | ✅   | ✅    | ✅          |
| `/dashboard/categories`     | ✅   | ✅    | ✅          |
| `/dashboard/items`          | ✅   | ✅    | ✅          |
| `/dashboard/users`          | ❌   | ✅    | ✅          |
| `/dashboard/profile`        | ✅   | ✅    | ✅          |
| `/superadmin/organizations` | ❌   | ❌    | ✅          |
| `/auth/activate?token=...`  | 🔓   | 🔓    | 🔓          |

### 4. Visibilidad en el Menú

**USER (Operador):**
```
MENÚ PRINCIPAL
├── Inicio
├── Categorías
├── Items
└── Perfil

APLICACIONES
├── App Cliente
└── App Operador
```

**ADMIN (Administrador):**
```
MENÚ PRINCIPAL
├── Inicio
├── Categorías
├── Items
├── 👥 Usuarios (nuevo)
└── Perfil

APLICACIONES
├── App Cliente
└── App Operador
```

**SUPER_ADMIN:**
```
MENÚ PRINCIPAL
├── Inicio
├── Categorías
├── Items
├── 👥 Usuarios
└── Perfil

GESTIÓN
└── 🏢 Organizaciones [SUPER]

APLICACIONES
├── App Cliente
└── App Operador
```

---

## 🧪 Testing

### Estrategia de Testing

El proyecto tiene **357 tests** cubriendo todas las capas:

```
src/
├── domain/{entity}/__tests__/           # Tests de servicios de dominio
├── infrastructure/prisma/repositories/__tests__/  # Tests de repositorios
├── actions/__tests__/{entity}/          # Tests de server actions
├── lib/services/{service}/__tests__/    # Tests de servicios externos
└── test/                               # Utilidades de testing
    ├── fixtures/                       # Factorías de datos
    ├── mocks/                          # Mocks centralizados
    │   ├── prisma-repositories.ts      # Mocks de repositorios
    │   └── services.ts                 # Mocks de servicios
    └── helpers/                        # Helpers de testing
```

### Patrones de Testing

#### 1. Tests de Repositorios

```typescript
import { describe, it, expect, vi } from 'vitest';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';

describe('UserRepository', () => {
  it('should find user by id', async () => {
    const mockRepo = {
      getById: vi.fn().mockResolvedValue(mockUser),
    };
    
    const result = await mockRepo.getById('user-123');
    expect(result).toEqual(mockUser);
  });
});
```

#### 2. Tests de Servicios de Dominio

```typescript
import { createUserServiceImpl } from '@/domain/users/UserServiceImpl';
import { mockUserRepository } from '@/test/mocks/prisma-repositories';

describe('UserService', () => {
  it('should create user with organization', async () => {
    const mockRepo = {
      create: vi.fn().mockResolvedValue(newUser),
    };
    
    const service = createUserServiceImpl({
      userRepository: mockRepo,
      // otras dependencias...
    });
    
    const result = await service.createUser(input);
    expect(result).toEqual(newUser);
  });
});
```

#### 3. Tests de Server Actions

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createItem } from '@/actions/items/create';

// Mock global de la action
vi.mock('@/actions/items/create', () => ({
  createItem: vi.fn().mockResolvedValue({ success: true, data: mockItem }),
}));

describe('createItem action', () => {
  it('should create item for organization', async () => {
    const result = await createItem(input);
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockItem);
  });
});
```

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests específicos
npm test categories
npm test items
npm test users

# Tests con cobertura
npm test -- --coverage

# Tests en modo watch
npm test -- --watch
```

---

## 💻 Desarrollo

### Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd certypass

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Ejecutar migraciones
npx prisma migrate dev

# Generar cliente Prisma
npx prisma generate

# Iniciar servidor de desarrollo
npm run dev
```

### Scripts Disponibles

```bash
npm run dev           # Servidor de desarrollo
npm run build         # Build de producción
npm start             # Servidor de producción
npm test              # Ejecutar tests
npm run lint          # Linter
npm run type-check    # Verificar tipos
```

### Agregar Nueva Funcionalidad

1. **Definir Repositorio** en `src/domain/{entity}/Repository.ts`
   ```typescript
   export interface MyEntityRepository {
     findByOrganization(organizationId: string): Promise<Entity[]>;
   }
   ```

2. **Implementar Repositorio** en `src/infrastructure/prisma/repositories/`
   ```typescript
   import { prisma } from '@/lib/prisma';
   
   export const myEntityRepository: MyEntityRepository = {
     async findByOrganization(organizationId: string) {
       return await prisma.entity.findMany({ where: { organizationId } });
     },
   };
   ```

3. **Definir Servicio** en `src/domain/{entity}/Service.ts`
   ```typescript
   export interface MyEntityService {
     listEntities(): Promise<Entity[]>;
   }
   ```

4. **Implementar Servicio** en `src/domain/{entity}/ServiceImpl.ts`
   ```typescript
   export function createMyEntityServiceImpl(deps: {
     entityRepository: MyEntityRepository;
   }): MyEntityService {
     return {
       async listEntities() {
         const organizationId = await requireOrganizationId();
         return await deps.entityRepository.findByOrganization(organizationId);
       },
     };
   }
   ```

5. **Crear Server Action** en `src/actions/{entity}/`
   ```typescript
   "use server";
   
   import { createMyEntityServiceImpl } from '@/domain/{entity}/ServiceImpl';
   import { myEntityRepository } from '@/infrastructure/prisma/repositories/MyEntityRepositoryPrisma';
   
   export async function listMyEntities() {
     const service = createMyEntityServiceImpl({
       entityRepository: myEntityRepository,
     });
     
     return await service.listEntities();
   }
   ```

6. **Agregar Tests** para todas las capas

### Reglas del Proyecto

- ✅ Usar async/await para código asíncrono
- ✅ Inyección de dependencias con factory functions
- ✅ Errores tipados con clases ES6 (`extends Error` con `_tag`)
- ✅ Repository Pattern para abstracción de DB
- ✅ Filtrar por `organizationId` en todos los repositorios
- ✅ Usar `requireOrganizationId()` en todas las server actions
- ❌ No importar `@prisma/client` fuera de `src/infrastructure/`
- ❌ No hacer `fetch()` directamente en domain/actions (usar servicios en `src/lib/services/`)
- ✅ Usar try/catch para manejo de errores

---

## 📚 Recursos Adicionales

### Tecnologías Principales
- **[Next.js](https://nextjs.org/)** - Framework React con SSR
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Prisma](https://www.prisma.io/)** - ORM para PostgreSQL
- **[Vitest](https://vitest.dev/)** - Testing framework
- **[React Bootstrap](https://react-bootstrap.github.io/)** - UI Components

### Documentación Complementaria
- `docs/REPOSITORY_PATTERN.md` - Patrón Repository
- `docs/ENVIRONMENT_VARIABLES.md` - Variables de entorno

### Estado del Proyecto

| Componente | Estado | Tests | Notas |
|------------|--------|-------|-------|
| Multi-Tenancy | ✅ Completo | ✅ 357 tests | Sistema completo con TenantService |
| Autenticación JWT | ✅ Completo | ✅ Funcionando | JWT separados por rol |
| Repository Pattern | ✅ Completo | ✅ Funcionando | Todos los repositorios migrados |
| Domain Services | ✅ Completo | ✅ Funcionando | Async/await con DI manual |
| Server Actions | ✅ Completo | ✅ Funcionando | Orquestación con Layers |
| Dashboard | ✅ Completo | ✅ Funcionando | KPIs y analytics |
| Super Admin Panel | ✅ Completo | ✅ Funcionando | Gestión de organizaciones |
| User Invitations | ✅ Completo | ✅ Funcionando | Sistema de activación |

---

## 📄 Licencia

[Especificar licencia]

## 👥 Equipo

[Especificar equipo de desarrollo]

---

---

## 🔄 Refactorización: Eliminación de Effect.ts

**Estado:** ✅ Completado (Enero 2026)

El proyecto fue refactorizado para eliminar completamente la dependencia de Effect.ts, migrando a async/await nativo de TypeScript. Esta refactorización resultó en:

- **Reducción de código**: ~6,000-7,500 líneas eliminadas
- **Simplificación**: Código más directo y fácil de entender
- **Mejor rendimiento**: Menos overhead de abstracciones
- **Mejor mantenibilidad**: Patrones más familiares para desarrolladores

### Cambios Principales

- **Errores**: Migrados de `Data.TaggedError` a clases ES6 con propiedad `_tag`
- **Servicios**: Migrados de `Context.Tag` y `Layer` a interfaces y factory functions
- **Repositorios**: Migrados de Effect a async/await directo con Prisma
- **Dependency Injection**: Cambiada de Effect Layers a inyección manual con factory functions
- **Tenant Service**: Reemplazado por helpers simples en `src/lib/auth/tenant.ts`

**Última actualización:** Enero 2026
