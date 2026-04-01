import { prisma } from "./prisma";
import { CourseStatus } from "@prisma/client";

/**
 * Records a course status change in the audit history
 */
export async function recordCourseStatusChange(
  courseId: string,
  fromStatus: CourseStatus | null,
  toStatus: CourseStatus,
  reason?: string,
  changedById?: string,
  approvalToken?: string
): Promise<void> {
  await prisma.courseStatusHistory.create({
    data: {
      courseId,
      fromStatus,
      toStatus,
      reason: reason || null,
      changedById: changedById || null,
      approvalToken: approvalToken || null,
    },
  });
}

/**
 * Gets the complete status history for a course
 */
export async function getCourseStatusHistory(courseId: string) {
  return await prisma.courseStatusHistory.findMany({
    where: { courseId },
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
export async function getRejectionHistory(courseId: string) {
  return await prisma.courseStatusHistory.findMany({
    where: {
      courseId,
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