-- Move KYC fields from User to Organization
-- This migration moves signatureID, kycURL, and verificationStatus from User to Organization
-- Backfill strategy: For each organization, use the most recently updated user with a signatureID

-- Step 1: Add KYC fields to Organization
ALTER TABLE "Organization" ADD COLUMN "signatureID" TEXT;
ALTER TABLE "Organization" ADD COLUMN "kycURL" TEXT;
ALTER TABLE "Organization" ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED';

-- Step 2: Create unique index on Organization.signatureID
CREATE UNIQUE INDEX "Organization_signatureID_key" ON "Organization"("signatureID") WHERE "signatureID" IS NOT NULL;

-- Step 3: Backfill: Copy signatureID and verificationStatus from most recent user per organization
-- Strategy: For each organization, find the user with signatureID that was most recently updated
-- If multiple users have signatureID, prefer the one with the latest updatedAt
UPDATE "Organization" o
SET 
  "signatureID" = subquery."signatureID",
  "verificationStatus" = subquery."verificationStatus",
  "kycURL" = subquery."kycURL"
FROM (
  SELECT DISTINCT ON (u."organizationId")
    u."organizationId",
    u."signatureID",
    u."verificationStatus",
    u."kycURL"
  FROM "User" u
  WHERE u."organizationId" IS NOT NULL
    AND u."signatureID" IS NOT NULL
  ORDER BY u."organizationId", u."updatedAt" DESC NULLS LAST, u."createdAt" DESC NULLS LAST
) AS subquery
WHERE o.id = subquery."organizationId"
  AND o."signatureID" IS NULL;

-- Step 4: Remove KYC fields from User
-- First, drop the unique constraint on User.signatureID
DROP INDEX IF EXISTS "User_signatureID_key";

-- Then remove the columns
ALTER TABLE "User" DROP COLUMN IF EXISTS "signatureID";
ALTER TABLE "User" DROP COLUMN IF EXISTS "kycURL";
ALTER TABLE "User" DROP COLUMN IF EXISTS "verificationStatus";
