/*
  Warnings:

  - You are about to drop the column `status` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_status_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "status";

-- DropEnum
DROP TYPE "UserStatus";
