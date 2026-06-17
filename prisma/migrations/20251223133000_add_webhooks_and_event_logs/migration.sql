-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "headers" JSONB,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Webhook_organizationId_idx" ON "Webhook"("organizationId");

-- CreateIndex
CREATE INDEX "Webhook_organizationId_active_idx" ON "Webhook"("organizationId", "active");

-- CreateIndex
CREATE INDEX "EventLog_organizationId_idx" ON "EventLog"("organizationId");

-- CreateIndex
CREATE INDEX "EventLog_organizationId_eventType_idx" ON "EventLog"("organizationId", "eventType");

-- CreateIndex
CREATE INDEX "EventLog_organizationId_entityType_entityId_idx" ON "EventLog"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "EventLog_createdAt_idx" ON "EventLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


