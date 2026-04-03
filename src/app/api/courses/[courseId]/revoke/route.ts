import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const session = await auth();

  // Check if user is admin
  const isAdmin = !!session?.user?.email && session.user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
  }

  const { courseId } = params;

  try {
    // Start a transaction to revoke the course and all associated FKT attempts
    await prisma.$transaction(async (tx) => {
      // First, check if the course exists and is approved
      const course = await tx.course.findUnique({
        where: { id: courseId },
        select: { id: true, name: true, status: true }
      });

      if (!course) {
        throw new Error("Course not found");
      }

      if (course.status !== "APPROVED") {
        throw new Error("Course is not approved and cannot be revoked");
      }

      // Update course status to REVOKED
      await tx.course.update({
        where: { id: courseId },
        data: {
          status: "REVOKED"
        }
      });

      // Update all approved FKT attempts for this course to REVOKED status
      const revokedAttempts = await tx.fktAttempt.updateMany({
        where: {
          courseId: courseId,
          status: "APPROVED"
        },
        data: {
          status: "REVOKED"
        }
      });

      // Log the revocation for audit purposes
      console.log(`🔴 [COURSE_REVOKED] Admin ${session.user.email} revoked course:`, {
        courseId: course.id,
        courseName: course.name,
        revokedAttemptsCount: revokedAttempts.count,
        timestamp: new Date().toISOString()
      });

      // Create status history record
      await tx.courseStatusHistory.create({
        data: {
          courseId: courseId,
          fromStatus: "APPROVED",
          toStatus: "REVOKED",
          changedById: session.user.id,
          reason: `Course revoked by admin ${session.user.email}`
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: "Course and associated FKT attempts have been revoked"
    });

  } catch (error) {
    console.error("Error revoking course:", error);

    const message = error instanceof Error ? error.message : "Failed to revoke course";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}