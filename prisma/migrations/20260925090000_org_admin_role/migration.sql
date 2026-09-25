-- AlterEnum
-- The account that operates an organization and sees all of its companies (#20).
-- Only adds the value: no row uses it until the code that understands it is
-- deployed, and adding it does not touch any existing one.
ALTER TYPE "UserRole" ADD VALUE 'ORG_ADMIN';
