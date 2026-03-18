import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type NewsEvent = {
  id: string;
  type: "route_approved" | "fkt_attempt";
  date: string;
  data: {
    routeName: string;
    country: string;
    sailorName?: string;
    rigSize?: string;
    durationSec?: number;
    submitterName?: string;
  };
};

export async function GET() {
  try {
    // Get recent approved routes
    const recentRoutes = await prisma.route.findMany({
      where: {
        status: "APPROVED",
        approvedAt: { not: null }
      },
      select: {
        id: true,
        name: true,
        country: true,
        approvedAt: true,
        submittedBy: { select: { name: true } }
      },
      orderBy: { approvedAt: "desc" },
      take: 5, // Get more than 3 in case we need to filter
    });

    // Get recent successful FKT attempts
    const recentAttempts = await prisma.fktAttempt.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        sailorName: true,
        rigSize: true,
        durationSec: true,
        submittedAt: true,
        route: {
          select: {
            name: true,
            country: true
          }
        },
        athlete: {
          select: { name: true }
        }
      },
      orderBy: { submittedAt: "desc" },
      take: 5, // Get more than 3 in case we need to filter
    });


    // Convert to news events
    const routeEvents: NewsEvent[] = recentRoutes.map(route => ({
      id: `route-${route.id}`,
      type: "route_approved" as const,
      date: route.approvedAt!.toISOString(),
      data: {
        routeName: route.name,
        country: route.country,
        submitterName: route.submittedBy?.name || "Unknown"
      }
    }));

    const attemptEvents: NewsEvent[] = recentAttempts.map(attempt => ({
      id: `attempt-${attempt.id}`,
      type: "fkt_attempt" as const,
      date: attempt.submittedAt.toISOString(),
      data: {
        routeName: attempt.route.name,
        country: attempt.route.country,
        sailorName: attempt.sailorName || attempt.athlete.name || "Unknown",
        rigSize: attempt.rigSize,
        durationSec: attempt.durationSec
      }
    }));

    // Combine and sort by date (most recent first)
    const allEvents = [...routeEvents, ...attemptEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3); // Take top 3


    return NextResponse.json({ events: allEvents });
  } catch (error) {
    console.error("Failed to fetch news events:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}