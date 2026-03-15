-- CreateTable
CREATE TABLE "RouteStatusHistory" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "fromStatus" "RouteStatus",
    "toStatus" "RouteStatus" NOT NULL,
    "reason" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalToken" TEXT,

    CONSTRAINT "RouteStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RouteStatusHistory_routeId_idx" ON "RouteStatusHistory"("routeId");

-- CreateIndex
CREATE INDEX "RouteStatusHistory_changedAt_idx" ON "RouteStatusHistory"("changedAt");

-- AddForeignKey
ALTER TABLE "RouteStatusHistory" ADD CONSTRAINT "RouteStatusHistory_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStatusHistory" ADD CONSTRAINT "RouteStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
