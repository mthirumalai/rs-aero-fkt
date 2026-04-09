import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCourseRejectionEmail } from "@/lib/email/ses";
import { recordCourseStatusChange } from "@/lib/course-status-history";

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const { token, action, rejectionReason, coordinateUpdates } = await req.json();

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
    // Prepare update data
    const updateData: {
      status: "APPROVED" | "REJECTED";
      approvedAt: Date | null;
      approvalToken: null;
      rejectionReason: string | null;
      startLat?: number;
      startLng?: number;
      finishLat?: number;
      finishLng?: number;
      turningMarkLat?: number;
      turningMarkLng?: number;
    } = {
      status: newStatus,
      approvedAt: isApprove ? new Date() : null,
      approvalToken: null,
      rejectionReason: isApprove ? null : rejectionReason.trim(),
    };

    // Include coordinate updates if approving and coordinates were provided
    if (isApprove && coordinateUpdates) {
      if (coordinateUpdates.startLat !== undefined) updateData.startLat = coordinateUpdates.startLat;
      if (coordinateUpdates.startLng !== undefined) updateData.startLng = coordinateUpdates.startLng;
      if (coordinateUpdates.finishLat !== undefined) updateData.finishLat = coordinateUpdates.finishLat;
      if (coordinateUpdates.finishLng !== undefined) updateData.finishLng = coordinateUpdates.finishLng;
      if (coordinateUpdates.turningMarkLat !== undefined) updateData.turningMarkLat = coordinateUpdates.turningMarkLat;
      if (coordinateUpdates.turningMarkLng !== undefined) updateData.turningMarkLng = coordinateUpdates.turningMarkLng;
    }

    // Update the course status and potentially coordinates
    const updatedRoute = await tx.course.update({
      where: { id: params.courseId },
      data: updateData,
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
  const statusChangeReason = isApprove
    ? (coordinateUpdates
        ? "Course approved with coordinate adjustments and associated FKT attempts"
        : "Course approved with associated FKT attempts")
    : rejectionReason.trim();

  await recordCourseStatusChange(
    params.courseId,
    course.status, // fromStatus
    newStatus, // toStatus
    statusChangeReason,
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
