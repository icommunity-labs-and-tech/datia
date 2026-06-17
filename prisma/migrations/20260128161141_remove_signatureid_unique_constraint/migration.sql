-- Remove unique constraint from Organization.signatureID
-- This allows multiple organizations to share the same signatureID (useful for demos)

-- Drop the unique index on Organization.signatureID
DROP INDEX IF EXISTS "Organization_signatureID_key";

-- Note: The regular index on signatureID (for performance) remains via @@index([signatureID])
