-- DropForeignKey
ALTER TABLE "ApiToken" DROP CONSTRAINT "ApiToken_organizationId_fkey";

-- DropIndex
DROP INDEX "ApiToken_organizationId_idx";

-- AlterTable
ALTER TABLE "ApiToken" DROP COLUMN "organizationId",
ALTER COLUMN "companyId" SET NOT NULL;
