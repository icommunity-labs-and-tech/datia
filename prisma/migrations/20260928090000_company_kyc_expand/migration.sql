-- AlterTable
-- KYC propio de cada empresa (#23): antes había una sola firma por
-- organización. Aditivo: Organization.signatureID/kycURL/verificationStatus
-- se quedan donde están hasta que el código deje de leerlos de ahí.
ALTER TABLE "Company" ADD COLUMN "signatureID" TEXT;
ALTER TABLE "Company" ADD COLUMN "kycURL" TEXT;
ALTER TABLE "Company" ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED';

-- CreateIndex
CREATE INDEX "Company_signatureID_idx" ON "Company"("signatureID");

-- Backfill: la firma de cada organización pasa a su empresa. Hoy cada
-- organización tiene una sola empresa (invariante de la fase 1 de #20), así
-- que no hay ambigüedad sobre a cuál pertenece. Si alguna vez tuviera más de
-- una, se deja sin tocar (NOT_VERIFIED) en vez de adivinar.
UPDATE "Company" c
SET "signatureID" = o."signatureID",
    "kycURL" = o."kycURL",
    "verificationStatus" = o."verificationStatus"
FROM "Organization" o
WHERE c."organizationId" = o.id
  AND (SELECT count(*) FROM "Company" c2 WHERE c2."organizationId" = o.id) = 1;
