-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- AddForeignKey
-- With password recovery in use (#36), a user who asked for a reset has tokens.
-- The old RESTRICT made deleting that user, or the organization it belongs to,
-- fail; a token is worthless without its user, so it goes with it.
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
