-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('ISSUED', 'CERTIFIED');

-- AlterTable
ALTER TABLE "EmissionRecord" ADD COLUMN     "certificationId" TEXT;

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "status" "CertificationStatus" NOT NULL DEFAULT 'ISSUED',
    "payload" JSONB NOT NULL,
    "network" TEXT,
    "hash" TEXT,
    "checkerUrl" TEXT,
    "blockExplorerUrl" TEXT,
    "certifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certification_evidenceId_key" ON "Certification"("evidenceId");

-- CreateIndex
CREATE INDEX "Certification_organizationId_status_idx" ON "Certification"("organizationId", "status");

-- CreateIndex
CREATE INDEX "EmissionRecord_certificationId_idx" ON "EmissionRecord"("certificationId");

-- AddForeignKey
ALTER TABLE "EmissionRecord" ADD CONSTRAINT "EmissionRecord_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── Copy the emission proofs that lived as states ───────────────────────────
-- Until now an emission was certified by creating a State under the status type
-- «Certificación Energética», with the proof inside `templateConfig`. Each one
-- becomes a Certification with the same id, so this block can be run again
-- after the deploy to pick up proofs issued in between (ON CONFLICT skips what
-- is already copied). A state counts as certified only if it has the on-chain
-- hash: `backed` alone was set by the old certify route before iBS confirmed.

INSERT INTO "Certification" (
  "id", "organizationId", "evidenceId", "status", "payload",
  "network", "hash", "checkerUrl", "blockExplorerUrl", "certifiedAt",
  "createdAt", "updatedAt"
)
SELECT
  s."id",
  i."organizationId",
  s."evidenceID",
  CASE WHEN s."templateConfig" ? 'certificationHash'
       THEN 'CERTIFIED'::"CertificationStatus"
       ELSE 'ISSUED'::"CertificationStatus" END,
  s."templateConfig" - 'certificationHash' - 'certificationNetwork' - 'checkerUrl'
                     - 'blockExplorerUrl' - 'certifiedAt',
  s."templateConfig"->>'certificationNetwork',
  s."templateConfig"->>'certificationHash',
  s."templateConfig"->>'checkerUrl',
  s."templateConfig"->>'blockExplorerUrl',
  CASE WHEN s."templateConfig" ? 'certificationHash' THEN s."backedAt" END,
  s."createdAt",
  CURRENT_TIMESTAMP
FROM "State" s
JOIN "StatusType" st ON st."id" = s."statusTypeId"
JOIN "Item" i ON i."id" = s."itemId"
WHERE st."name" = 'Certificación Energética'
  AND s."evidenceID" IS NOT NULL
  AND s."evidenceID" <> 'pending'
ON CONFLICT DO NOTHING;

-- Link each emission to the proof that covers it: one per record, or a whole
-- month for the BMS ones (`emissionRecordIds`). If two proofs cover the same
-- record, the certified and older one wins.
UPDATE "EmissionRecord" e
SET "certificationId" = link."certificationId"
FROM (
  SELECT DISTINCT ON (e2."id") e2."id" AS "emissionId", c."id" AS "certificationId"
  FROM "EmissionRecord" e2
  JOIN "Certification" c
    ON c."payload"->>'emissionRecordId' = e2."id"
    OR (jsonb_typeof(c."payload"->'emissionRecordIds') = 'array'
        AND c."payload"->'emissionRecordIds' ? e2."id")
  ORDER BY e2."id", (c."status" = 'CERTIFIED') DESC, c."createdAt" ASC
) link
WHERE e."id" = link."emissionId"
  AND e."certificationId" IS NULL;
