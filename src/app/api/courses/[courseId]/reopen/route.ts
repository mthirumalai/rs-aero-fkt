import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";
import { sendCourseApprovalEmail } from "@/lib/email/ses";
import { recordCourseStatusChange } from "@/lib/course-status-history";

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  // Check admin authorization
  const session = await auth();
  const isAdmin = !!session?.user?.email && session.user.email === process.env.ADMIN_EMAIL;

  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { courseId } = params;

  try {
    // Find the course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { submittedBy: { select: { name: true, email: true } } },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (course.status !== "REJECTED") {
      return NextResponse.json({ error: "Only rejected courses can be re-opened" }, { status: 400 });
    }

    // Generate new approval token and reset status (keep rejection history)
    const newApprovalToken = randomUUID();

    const updatedRoute = await prisma.course.update({
      where: { id: courseId },
      data: {
        status: "PENDING",
        approvalToken: newApprovalToken,
        // Keep rejectionReason and other history for admin reference
        approvedAt: null,
      },
    });

    // Record the re-opening in status history
    await recordCourseStatusChange(
      courseId,
      course.status, // fromStatus (REJECTED)
      "PENDING", // toStatus
      "Course re-opened by admin for reconsideration",
      session.user.id, // changedById
      newApprovalToken
    );

    // Send new approval email
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    try {
      await sendCourseApprovalEmail({
        courseId: course.id,
        courseName: course.name,
        submitterName: course.submittedBy.name ?? "Unknown",
        submitterEmail: course.submittedBy.email ?? "",
        approvalToken: newApprovalToken,
        baseUrl,
      });
    } catch (err) {
      console.error("Failed to send re-approval email:", err);
      // Continue anyway - the course was re-opened successfully
    }

    return NextResponse.json({
      success: true,
      message: "Course re-opened and approval email sent",
      status: updatedRoute.status
    });

  } catch (error) {
    console.error("Error re-opening course:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}