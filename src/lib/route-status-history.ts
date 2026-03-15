import { prisma } from "./prisma";
import { RouteStatus } from "@prisma/client";

/**
 * Records a route status change in the audit history
 */
export async function recordRouteStatusChange(
  routeId: string,
  fromStatus: RouteStatus | null,
  toStatus: RouteStatus,
  reason?: string,
  changedById?: string,
  approvalToken?: string
): Promise<void> {
  await prisma.routeStatusHistory.create({
    data: {
      routeId,
      fromStatus,
      toStatus,
      reason: reason || null,
      changedById: changedById || null,
      approvalToken: approvalToken || null,
    },
  });
}

/**
 * Gets the complete status history for a route
 */
export async function getRouteStatusHistory(routeId: string) {
  return await prisma.routeStatusHistory.findMany({
    where: { routeId },
    include: {
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { changedAt: "desc" },
  });
}

/**
 * Gets the rejection history specifically (all REJECTED status changes)
 */
export async function getRejectionHistory(routeId: string) {
  return await prisma.routeStatusHistory.findMany({
    where: {
      routeId,
      toStatus: "REJECTED"
    },
    include: {
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { changedAt: "desc" },
  });
}