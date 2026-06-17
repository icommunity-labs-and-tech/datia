-- Migración: Separar StatusType de Category y convertir Category en sistema de etiquetado many-to-many

-- Paso 1: Migrar StatusType a Organization
-- 1. Añadir organizationId a StatusType
ALTER TABLE "StatusType" ADD COLUMN "organizationId" TEXT;

-- 2. Migrar datos: obtener organizationId desde Category
UPDATE "StatusType" 
SET "organizationId" = (
  SELECT "organizationId" 
  FROM "Category" 
  WHERE "Category"."id" = "StatusType"."categoryId"
);

-- 3. Verificar que todos los StatusType tienen organizationId (no debe haber NULLs)
-- SELECT COUNT(*) FROM "StatusType" WHERE "organizationId" IS NULL; -- Debe ser 0

-- 4. Hacer organizationId NOT NULL y añadir foreign key
ALTER TABLE "StatusType" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "StatusType" ADD CONSTRAINT "StatusType_organizationId_fkey" 
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

-- 5. Eliminar la foreign key constraint de categoryId
ALTER TABLE "StatusType" DROP CONSTRAINT IF EXISTS "StatusType_categoryId_fkey";

-- 6. Eliminar la columna categoryId de StatusType
ALTER TABLE "StatusType" DROP COLUMN "categoryId";

-- 7. Resolver duplicados antes de crear índice único
-- Renombrar duplicados añadiendo un sufijo basado en el ID
UPDATE "StatusType" st1
SET name = st1.name || ' (' || SUBSTRING(st1.id, 1, 8) || ')'
WHERE EXISTS (
  SELECT 1 
  FROM "StatusType" st2 
  WHERE st2."organizationId" = st1."organizationId" 
    AND st2.name = st1.name 
    AND st2.id < st1.id
);

-- 8. Añadir índice único para [organizationId, name]
CREATE UNIQUE INDEX "StatusType_organizationId_name_key" ON "StatusType"("organizationId", "name");

-- Paso 2: Crear tabla ItemCategory y migrar datos
-- Crear tabla intermedia
CREATE TABLE "ItemCategory" (
  "itemId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "ItemCategory_pkey" PRIMARY KEY ("itemId", "categoryId")
);

-- Migrar datos existentes: cada Item con categoryId → ItemCategory
INSERT INTO "ItemCategory" ("itemId", "categoryId")
SELECT "id", "categoryId" FROM "Item" WHERE "categoryId" IS NOT NULL;

-- Añadir foreign keys a ItemCategory
ALTER TABLE "ItemCategory" ADD CONSTRAINT "ItemCategory_itemId_fkey" 
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE;
ALTER TABLE "ItemCategory" ADD CONSTRAINT "ItemCategory_categoryId_fkey" 
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE;

-- Añadir índices a ItemCategory
CREATE INDEX "ItemCategory_itemId_idx" ON "ItemCategory"("itemId");
CREATE INDEX "ItemCategory_categoryId_idx" ON "ItemCategory"("categoryId");

-- Paso 3: Eliminar categoryId de Item
-- Eliminar foreign key constraint de categoryId en Item
ALTER TABLE "Item" DROP CONSTRAINT IF EXISTS "Item_categoryId_fkey";

-- Eliminar índice de categoryId en Item
DROP INDEX IF EXISTS "Item_organizationId_categoryId_idx";

-- Eliminar la columna categoryId de Item
ALTER TABLE "Item" DROP COLUMN "categoryId";

-- Paso 4: Añadir índice organizationId a StatusType (si no existe ya)
CREATE INDEX IF NOT EXISTS "StatusType_organizationId_idx" ON "StatusType"("organizationId");

