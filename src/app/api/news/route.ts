import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type NewsEvent = {
  id: string;
  type: "route_proposed" | "route_approved" | "fkt_attempt";
  date: string;
  data: {
    routeName: string;
    country: string;
    routeId: string;
    attemptId?: string;
    sailorName?: string;
    rigSize?: string;
    durationSec?: number;
    submitterName?: string;
    status?: string;
  };
};

export async function GET() {
  try {
    // Get recent routes (both pending and approved)
    const recentRoutes = await prisma.route.findMany({
      where: {
        OR: [
          { status: "PENDING" },
          { status: "APPROVED", approvedAt: { not: null } }
        ]
      },
      select: {
        id: true,
        name: true,
        country: true,
        status: true,
        submittedAt: true,
        approvedAt: true,
        submittedBy: { select: { name: true } }
      },
      orderBy: [
        { approvedAt: "desc" },
        { submittedAt: "desc" }
      ],
      take: 10, // Get more to account for filtering
    });

    // Get recent successful FKT attempts (only for approved routes)
    const recentAttempts = await prisma.fktAttempt.findMany({
      where: {
        status: "APPROVED",
        route: { status: "APPROVED" } // Only show FKTs for approved routes
      },
      select: {
        id: true,
        routeId: true,
        sailorName: true,
        rigSize: true,
        durationSec: true,
        submittedAt: true,
        route: {
          select: {
            name: true,
            country: true,
            status: true
          }
        },
        athlete: {
          select: { name: true }
        }
      },
      orderBy: { submittedAt: "desc" },
      take: 5,
    });

    // Create route events - both proposed and approved
    const routeEvents: NewsEvent[] = [];
    const approvedRouteIds = new Set<string>();

    // First pass: collect approved routes
    recentRoutes.forEach(route => {
      if (route.status === "APPROVED") {
        approvedRouteIds.add(route.id);
        routeEvents.push({
          id: `route-approved-${route.id}`,
          type: "route_approved" as const,
          date: route.approvedAt!.toISOString(),
          data: {
            routeName: route.name,
            country: route.country,
            routeId: route.id,
            submitterName: route.submittedBy?.name || "Unknown",
            status: route.status
          }
        });
      }
    });

    // Second pass: add pending routes (but only if they haven't been approved)
    recentRoutes.forEach(route => {
      if (route.status === "PENDING" && !approvedRouteIds.has(route.id)) {
        routeEvents.push({
          id: `route-proposed-${route.id}`,
          type: "route_proposed" as const,
          date: route.submittedAt.toISOString(),
          data: {
            routeName: route.name,
            country: route.country,
            routeId: route.id,
            submitterName: route.submittedBy?.name || "Unknown",
            status: route.status
          }
        });
      }
    });

    const attemptEvents: NewsEvent[] = recentAttempts.map(attempt => ({
      id: `attempt-${attempt.id}`,
      type: "fkt_attempt" as const,
      date: attempt.submittedAt.toISOString(),
      data: {
        routeName: attempt.route.name,
        country: attempt.route.country,
        routeId: attempt.routeId,
        attemptId: attempt.id,
        sailorName: attempt.sailorName || attempt.athlete.name || "Unknown",
        rigSize: attempt.rigSize,
        durationSec: attempt.durationSec,
        status: "APPROVED"
      }
    }));

    // Combine and sort by date (most recent first)
    const allEvents = [...routeEvents, ...attemptEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // Take top 5 to show more activity

    return NextResponse.json({ events: allEvents });
  } catch (error) {
    console.error("Failed to fetch news events:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}