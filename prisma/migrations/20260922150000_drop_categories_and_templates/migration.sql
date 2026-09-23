-- Retira categorías y plantillas (#37).
--
-- La posición vivía dentro de `templateFields` y ya está en sus columnas desde
-- 20260922130000_asset_position_columns. En producción no había más campos de
-- plantilla que ese, y las categorías eran una por activo, sin uso real.
--
-- Borra columnas y tablas que el código anterior usa: aplicar DESPUÉS de desplegar.

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "ItemCategory" DROP CONSTRAINT "ItemCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "ItemCategory" DROP CONSTRAINT "ItemCategory_itemId_fkey";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "itemTemplate",
DROP COLUMN "templateFields";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "ItemCategory";

