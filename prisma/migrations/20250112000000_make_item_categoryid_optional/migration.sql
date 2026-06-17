-- Make categoryId optional in Item table
-- This allows items to have multiple categories via ItemCategory (many-to-many)
-- The categoryId field is kept for backward compatibility but is now optional

-- Step 1: Drop the foreign key constraint temporarily
ALTER TABLE "Item" DROP CONSTRAINT IF EXISTS "Item_categoryId_fkey";

-- Step 2: Drop the index that includes categoryId (if it exists)
-- Note: Prisma generates index names, check actual index name first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'Item' 
    AND indexname LIKE '%categoryId%'
  ) THEN
    EXECUTE (
      SELECT 'DROP INDEX IF EXISTS "' || indexname || '";'
      FROM pg_indexes 
      WHERE tablename = 'Item' 
      AND indexname LIKE '%categoryId%'
      LIMIT 1
    );
  END IF;
END $$;

-- Step 3: Make categoryId nullable
ALTER TABLE "Item" ALTER COLUMN "categoryId" DROP NOT NULL;

-- Step 4: Re-add the foreign key constraint (now nullable)
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" 
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;
