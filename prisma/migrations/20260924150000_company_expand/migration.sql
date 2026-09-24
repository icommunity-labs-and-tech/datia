-- Empresa (#20), fase 1: EXPANDIR. Solo añade; no cambia ningún comportamiento.
--
-- Una empresa es la cuenta que opera el dashboard y a la que pertenece lo que
-- registra: activos, tokens, webhooks, eventos y pruebas. Esta fase crea la
-- tabla, una empresa por defecto por organización con lo que ya existe, y las
-- columnas `companyId` (nulables): el código actual las ignora y el nuevo las
-- rellena al escribir. El ámbito sigue siendo la organización hasta la fase 2.
--
-- Se aplica ANTES de mergear (es aditiva) y se repite el relleno después del
-- despliegue, por si algo se escribió entre medias (todo es idempotente).

-- AlterTable
ALTER TABLE "ApiCall" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "ApiToken" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "EventLog" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Certification" ADD COLUMN     "companyId" TEXT;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Company_organizationId_idx" ON "Company"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_organizationId_name_key" ON "Company"("organizationId", "name");

-- CreateIndex
CREATE INDEX "ApiCall_companyId_idx" ON "ApiCall"("companyId");

-- CreateIndex
CREATE INDEX "ApiToken_companyId_idx" ON "ApiToken"("companyId");

-- CreateIndex
CREATE INDEX "EventLog_companyId_idx" ON "EventLog"("companyId");

-- CreateIndex
CREATE INDEX "Asset_companyId_idx" ON "Asset"("companyId");

-- CreateIndex
CREATE INDEX "Webhook_companyId_idx" ON "Webhook"("companyId");

-- CreateIndex
CREATE INDEX "Certification_companyId_idx" ON "Certification"("companyId");

-- AddForeignKey
ALTER TABLE "ApiCall" ADD CONSTRAINT "ApiCall_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Relleno ────────────────────────────────────────────────────────────────
-- Una empresa por defecto por organización, con su mismo nombre.
INSERT INTO "Company" ("id", "organizationId", "name", "active", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, o."id", o."name", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Organization" o
WHERE NOT EXISTS (SELECT 1 FROM "Company" c WHERE c."organizationId" = o."id");

-- Todo lo que hoy cuelga de la organización pasa a la empresa por defecto.
UPDATE "Asset" t SET "companyId" = c."id" FROM "Company" c
  WHERE c."organizationId" = t."organizationId" AND t."companyId" IS NULL;
UPDATE "ApiToken" t SET "companyId" = c."id" FROM "Company" c
  WHERE c."organizationId" = t."organizationId" AND t."companyId" IS NULL;
UPDATE "ApiCall" t SET "companyId" = c."id" FROM "Company" c
  WHERE c."organizationId" = t."organizationId" AND t."companyId" IS NULL;
UPDATE "Webhook" t SET "companyId" = c."id" FROM "Company" c
  WHERE c."organizationId" = t."organizationId" AND t."companyId" IS NULL;
UPDATE "EventLog" t SET "companyId" = c."id" FROM "Company" c
  WHERE c."organizationId" = t."organizationId" AND t."companyId" IS NULL;
UPDATE "Certification" t SET "companyId" = c."id" FROM "Company" c
  WHERE c."organizationId" = t."organizationId" AND t."companyId" IS NULL;

-- Las cuentas con organización son cuentas de empresa; el superadmin, sin
-- organización, no pertenece a ninguna.
UPDATE "User" u SET "companyId" = c."id" FROM "Company" c
  WHERE c."organizationId" = u."organizationId" AND u."companyId" IS NULL;
