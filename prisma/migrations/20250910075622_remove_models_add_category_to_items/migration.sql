/*
  Warnings:

  - You are about to drop the column `modelId` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the `Model` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categoryId` to the `Item` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add the new columns to Item table with default values
ALTER TABLE "Item" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Item" ADD COLUMN "itemTemplate" JSONB DEFAULT '[]';

-- Step 2: Transfer data from Model to Item
-- Update items with categoryId and itemTemplate from their associated model
UPDATE "Item" 
SET 
  "categoryId" = "Model"."categoryId",
  "itemTemplate" = "Model"."itemTemplate"
FROM "Model" 
WHERE "Item"."modelId" = "Model"."id";

-- Step 3: Make categoryId NOT NULL after data transfer
ALTER TABLE "Item" ALTER COLUMN "categoryId" SET NOT NULL;

-- Step 4: Drop foreign key constraints
ALTER TABLE "Item" DROP CONSTRAINT "Item_modelId_fkey";
ALTER TABLE "Model" DROP CONSTRAINT "Model_categoryId_fkey";

-- Step 5: Drop the modelId column
ALTER TABLE "Item" DROP COLUMN "modelId";

-- Step 6: Drop the Model table
DROP TABLE "Model";

-- Step 7: Add new foreign key constraint
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
