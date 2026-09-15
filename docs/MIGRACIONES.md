# Migraciones de base de datos

El despliegue **no aplica migraciones**. `deploy.yml` solo publica la imagen, y
el contenedor arranca con `node server.js`. Cada cambio de esquema se aplica a
mano en producción, siguiendo este procedimiento.

## Lo que no se hace nunca contra producción

- **`prisma db push`**: cambia el esquema sin dejar rastro en
  `_prisma_migrations`. Es lo que desincronizó el historial hasta septiembre de
  2026. El script `db:push` se retiró por eso. Los e2e siguen usando
  `prisma db push`, pero solo contra su base SQLite.
- **SQL a mano** fuera de una carpeta de `prisma/migrations`.
- **`prisma migrate resolve --applied`** sin comprobar antes, con
  `prisma migrate diff`, que el cambio ya está de verdad en la base.

## Crear una migración

1. Cambiar `prisma/schema.prisma` y, si toca, `prisma/schema.e2e.prisma`.
2. Con una base de desarrollo, nunca la de producción:
   `npm run db:migrate:dev -- --name <descripcion>`.
3. Commitear la carpeta nueva de `prisma/migrations` en el mismo PR que el
   código que la necesita.

## Aplicarla en producción

Antes de mergear el PR, desde una IP autorizada en Cloud SQL (`ibs-prod`) y con
el `DATABASE_URL` de producción (IP pública; la contraseña es la de
`DATIA_DATABASE_URL` en Secret Manager):

```bash
npx prisma migrate status          # debe listar solo la migración nueva
npx prisma migrate diff --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --script   # revisar el SQL
npx prisma migrate deploy
npx prisma migrate status          # «Database schema is up to date!»
```

Después, mergear: el despliegue publica el código que usa el esquema nuevo.

Si la migración borra o renombra columnas que el código en producción todavía
usa, hay que partirla en dos: primero el cambio compatible con ambos códigos,
luego el despliegue y al final la limpieza.

## Estado del historial

El 15 de septiembre de 2026 se puso al día (#32):

- `20260115113558_move_kyc_to_organization` y
  `20260128161141_remove_signatureid_unique_constraint` estaban aplicadas a mano
  sin registrar; se marcaron con `migrate resolve --applied`.
- Se borró el registro huérfano `20260109_make_item_category_optional` (hay una
  copia de la fila en la issue #32).
- Se retiró `prisma/migrations/manual_add_api_token.sql`, copia exacta de
  `20251226233347_add_api_token`.

Desde entonces, `prisma migrate diff` entre producción y `schema.prisma` sale
vacío y `prisma migrate status` responde «up to date».
