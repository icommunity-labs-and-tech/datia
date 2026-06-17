-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "evidenceID" TEXT,
ADD COLUMN     "evidenceDataJson" TEXT,
ADD COLUMN     "createdByUserId" TEXT;

-- CreateIndex
CREATE INDEX "Item_createdByUserId_idx" ON "Item"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

