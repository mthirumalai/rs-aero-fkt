-- Add RouteStatusHistory table for comprehensive audit trail
CREATE TABLE "RouteStatusHistory" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalToken" TEXT,

    CONSTRAINT "RouteStatusHistory_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "RouteStatusHistory" ADD CONSTRAINT "RouteStatusHistory_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RouteStatusHistory" ADD CONSTRAINT "RouteStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for efficient querying
CREATE INDEX "RouteStatusHistory_routeId_idx" ON "RouteStatusHistory"("routeId");
CREATE INDEX "RouteStatusHistory_changedAt_idx" ON "RouteStatusHistory"("changedAt");

-- Migrate existing data: create initial history records for existing routes
INSERT INTO "RouteStatusHistory" ("id", "routeId", "fromStatus", "toStatus", "reason", "changedById", "changedAt")
SELECT
    'hist_' || "id",
    "id" as "routeId",
    NULL as "fromStatus",
    "status" as "toStatus",
    "rejectionReason" as "reason",
    "submittedById" as "changedById",
    COALESCE("approvedAt", "submittedAt") as "changedAt"
FROM "Route";