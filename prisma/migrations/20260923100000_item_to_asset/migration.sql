-- Renombra el modelo al vocabulario definitivo (#26) y retira `Issue`.
--
-- Escrita a mano: `prisma migrate diff` traduce un renombrado a DROP + CREATE,
-- que aquí sería perder los 24 activos y su cadena de energía. Con RENAME los
-- datos se quedan donde están.
--
-- Cambia nombres que el código anterior usa: aplicar JUSTO DESPUÉS de desplegar.
-- `Issue` está vacía en producción (0 filas, comprobado el 2026-09-18).

-- ── Item → Asset ────────────────────────────────────────────────────────────
ALTER TABLE "Item" RENAME TO "Asset";
ALTER TABLE "Asset" RENAME COLUMN "evidenceID" TO "evidenceId";
ALTER TABLE "Asset" DROP COLUMN "evidenceDataJson";

ALTER TABLE "Asset" RENAME CONSTRAINT "Item_pkey" TO "Asset_pkey";
ALTER TABLE "Asset" RENAME CONSTRAINT "Item_createdByUserId_fkey" TO "Asset_createdByUserId_fkey";
ALTER TABLE "Asset" RENAME CONSTRAINT "Item_organizationId_fkey" TO "Asset_organizationId_fkey";
ALTER INDEX "Item_createdByUserId_idx" RENAME TO "Asset_createdByUserId_idx";
ALTER INDEX "Item_organizationId_idx" RENAME TO "Asset_organizationId_idx";

-- ── EnergySource.itemId → assetId ───────────────────────────────────────────
ALTER TABLE "EnergySource" RENAME COLUMN "itemId" TO "assetId";
ALTER TABLE "EnergySource" RENAME CONSTRAINT "EnergySource_itemId_fkey" TO "EnergySource_assetId_fkey";
ALTER INDEX "EnergySource_itemId_idx" RENAME TO "EnergySource_assetId_idx";

-- ── Organization en inglés ──────────────────────────────────────────────────
ALTER TABLE "Organization" RENAME COLUMN "nombre" TO "name";
ALTER TABLE "Organization" RENAME COLUMN "dominio" TO "domain";
ALTER TABLE "Organization" RENAME COLUMN "activa" TO "active";
ALTER TABLE "Organization" RENAME COLUMN "configuracion" TO "settings";
ALTER INDEX "Organization_dominio_key" RENAME TO "Organization_domain_key";
ALTER INDEX "Organization_activa_idx" RENAME TO "Organization_active_idx";

-- ── Issue ───────────────────────────────────────────────────────────────────
DROP TABLE "Issue";
