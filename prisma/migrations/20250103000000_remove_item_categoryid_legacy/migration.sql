-- Remove legacy categoryId field and relation from Item table
-- This field was used for 1:1 relationship but we now use ItemCategory for many-to-many

-- Step 1: Drop the foreign key constraint
ALTER TABLE "Item" DROP CONSTRAINT IF EXISTS "Item_categoryId_fkey";

-- Step 2: Drop any indexes on categoryId (if they exist)
DROP INDEX IF EXISTS "Item_categoryId_idx";

-- Step 3: Remove the categoryId column
ALTER TABLE "Item" DROP COLUMN IF EXISTS "categoryId";
