import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type NewsEvent = {
  id: string;
  type: "course_proposed" | "course_approved" | "fkt_attempt";
  date: string;
  data: {
    courseName: string;
    country: string;
    courseId: string;
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
    // Get recent courses (both pending and approved)
    const recentRoutes = await prisma.course.findMany({
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

    // Get recent successful FKT attempts (only for approved courses)
    const recentAttempts = await prisma.fktAttempt.findMany({
      where: {
        status: "APPROVED",
        course: { status: "APPROVED" } // Only show FKTs for approved courses
      },
      select: {
        id: true,
        courseId: true,
        sailorName: true,
        rigSize: true,
        durationSec: true,
        submittedAt: true,
        course: {
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

    // Create course events - both proposed and approved
    const courseEvents: NewsEvent[] = [];
    const approvedRouteIds = new Set<string>();

    // First pass: collect approved courses
    recentRoutes.forEach(course => {
      if (course.status === "APPROVED") {
        approvedRouteIds.add(course.id);
        courseEvents.push({
          id: `course-approved-${course.id}`,
          type: "course_approved" as const,
          date: course.approvedAt!.toISOString(),
          data: {
            courseName: course.name,
            country: course.country,
            courseId: course.id,
            submitterName: course.submittedBy?.name || "Unknown",
            status: course.status
          }
        });
      }
    });

    // Second pass: add pending courses (but only if they haven't been approved)
    recentRoutes.forEach(course => {
      if (course.status === "PENDING" && !approvedRouteIds.has(course.id)) {
        courseEvents.push({
          id: `course-proposed-${course.id}`,
          type: "course_proposed" as const,
          date: course.submittedAt.toISOString(),
          data: {
            courseName: course.name,
            country: course.country,
            courseId: course.id,
            submitterName: course.submittedBy?.name || "Unknown",
            status: course.status
          }
        });
      }
    });

    const attemptEvents: NewsEvent[] = recentAttempts.map(attempt => ({
      id: `attempt-${attempt.id}`,
      type: "fkt_attempt" as const,
      date: attempt.submittedAt.toISOString(),
      data: {
        courseName: attempt.course.name,
        country: attempt.course.country,
        courseId: attempt.courseId,
        attemptId: attempt.id,
        sailorName: attempt.sailorName || attempt.athlete.name || "Unknown",
        rigSize: attempt.rigSize,
        durationSec: attempt.durationSec,
        status: "APPROVED"
      }
    }));

    // Combine and sort by date (most recent first)
    const allEvents = [...courseEvents, ...attemptEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // Take top 5 to show more activity

    return NextResponse.json({ events: allEvents });
  } catch (error) {
    console.error("Failed to fetch news events:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}