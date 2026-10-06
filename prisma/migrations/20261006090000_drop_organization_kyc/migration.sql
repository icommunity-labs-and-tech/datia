-- Contract step de la migración 20260928090000_company_kyc_expand (#23): el KYC
-- vive en Company desde entonces y el código ya no lee estas columnas de
-- Organization. Aplicar a mano en producción, DESPUÉS de desplegar la revisión
-- que no las usa (docs/MIGRACIONES.md).

-- DropIndex
DROP INDEX IF EXISTS "Organization_signatureID_key";
DROP INDEX IF EXISTS "Organization_signatureID_idx";

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "kycURL",
DROP COLUMN "signatureID",
DROP COLUMN "verificationStatus";
