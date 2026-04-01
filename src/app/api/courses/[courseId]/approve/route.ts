import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCourseRejectionEmail } from "@/lib/email/ses";
import { recordCourseStatusChange } from "@/lib/course-status-history";

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const { token, action, rejectionReason } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  if (action === "reject" && !rejectionReason?.trim()) {
    return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { id: params.courseId, approvalToken: token },
    include: { submittedBy: { select: { name: true, email: true } } },
  });

  if (!course) {
    return NextResponse.json({ error: "Invalid or already used token" }, { status: 404 });
  }

  if (course.status !== "PENDING") {
    return NextResponse.json({ error: "Course has already been processed" }, { status: 400 });
  }

  const isApprove = action !== "reject";
  const newStatus = isApprove ? "APPROVED" : "REJECTED";

  const updated = await prisma.$transaction(async (tx) => {
    // Update the course status
    const updatedRoute = await tx.course.update({
      where: { id: params.courseId },
      data: {
        status: newStatus,
        approvedAt: isApprove ? new Date() : null,
        approvalToken: null,
        rejectionReason: isApprove ? null : rejectionReason.trim(),
      },
    });

    // If approving the course, also approve any pending FKT attempts for this course
    if (isApprove) {
      await tx.fktAttempt.updateMany({
        where: {
          courseId: params.courseId,
          status: "PENDING"
        },
        data: {
          status: "APPROVED"
        }
      });
    }

    return updatedRoute;
  });

  // Record the status change in history
  await recordCourseStatusChange(
    params.courseId,
    course.status, // fromStatus
    newStatus, // toStatus
    isApprove ? "Course approved with associated FKT attempts" : rejectionReason.trim(),
    undefined, // changedById - we don't have admin user ID from token-based approval
    token
  );

  if (!isApprove) {
    try {
      await sendCourseRejectionEmail({
        courseName: course.name,
        submitterEmail: course.submittedBy.email,
        submitterName: course.submittedBy.name ?? "Sailor",
        rejectionReason: rejectionReason.trim(),
      });
    } catch (err) {
      console.error("Failed to send rejection email:", err);
    }
  }

  return NextResponse.json({ success: true, status: updated.status });
}
