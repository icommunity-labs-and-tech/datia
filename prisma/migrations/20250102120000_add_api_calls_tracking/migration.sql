-- CreateTable
CREATE TABLE "ApiCall" (
    "id" TEXT NOT NULL,
    "apiTokenId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiCall_apiTokenId_idx" ON "ApiCall"("apiTokenId");

-- CreateIndex
CREATE INDEX "ApiCall_organizationId_idx" ON "ApiCall"("organizationId");

-- CreateIndex
CREATE INDEX "ApiCall_createdAt_idx" ON "ApiCall"("createdAt");

-- CreateIndex
CREATE INDEX "ApiCall_apiTokenId_createdAt_idx" ON "ApiCall"("apiTokenId", "createdAt");

-- AddForeignKey
ALTER TABLE "ApiCall" ADD CONSTRAINT "ApiCall_apiTokenId_fkey" FOREIGN KEY ("apiTokenId") REFERENCES "ApiToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCall" ADD CONSTRAINT "ApiCall_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

