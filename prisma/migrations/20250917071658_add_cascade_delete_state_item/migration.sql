-- DropForeignKey
ALTER TABLE "State" DROP CONSTRAINT "State_itemId_fkey";

-- AddForeignKey
ALTER TABLE "State" ADD CONSTRAINT "State_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
