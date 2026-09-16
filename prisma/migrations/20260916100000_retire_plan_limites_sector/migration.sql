-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_sectorId_fkey";

-- DropIndex
DROP INDEX "Organization_sectorId_idx";

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "limites",
DROP COLUMN "plan",
DROP COLUMN "sectorId";

-- DropTable
DROP TABLE "Sector";

