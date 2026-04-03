import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ManageCoursesClient } from "./ManageCoursesClient";

export const metadata = { title: "Manage Courses — RS Aero FKT" };

export default async function ManageCoursesPage() {
  const session = await auth();

  const isAdmin = !!session?.user?.email && session.user.email === process.env.ADMIN_EMAIL;

  // Debug logging for admin email issue
  console.log('🔍 Admin Debug:', {
    userEmail: session?.user?.email,
    adminEmailEnvVar: process.env.ADMIN_EMAIL,
    isMatch: session?.user?.email === process.env.ADMIN_EMAIL,
    sessionExists: !!session,
    hasUser: !!session?.user,
    finalIsAdmin: isAdmin
  });

  const [pendingCourses, rejectedCourses, revokedCourses] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        name: true,
        country: true,
        courseType: true,
        startName: true,
        startLat: true,
        startLng: true,
        finishName: true,
        finishLat: true,
        finishLng: true,
        turningMarkName: true,
        turningMarkLat: true,
        turningMarkLng: true,
        submittedAt: true,
        approvalToken: true,
        submittedBy: { select: { name: true, email: true } },
      },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.course.findMany({
      where: { status: "REJECTED" },
      select: {
        id: true,
        name: true,
        country: true,
        courseType: true,
        startName: true,
        startLat: true,
        startLng: true,
        finishName: true,
        finishLat: true,
        finishLng: true,
        turningMarkName: true,
        turningMarkLat: true,
        turningMarkLng: true,
        submittedAt: true,
        rejectionReason: true,
        submittedBy: { select: { name: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.course.findMany({
      where: { status: "REVOKED" },
      select: {
        id: true,
        name: true,
        country: true,
        courseType: true,
        startName: true,
        startLat: true,
        startLng: true,
        finishName: true,
        finishLat: true,
        finishLng: true,
        turningMarkName: true,
        turningMarkLat: true,
        turningMarkLng: true,
        submittedAt: true,
        approvedAt: true,
        submittedBy: { select: { name: true, email: true } },
        attempts: {
          where: { status: "REVOKED" },
          select: { id: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  const serializePending = (r: (typeof pendingCourses)[number]) => ({
    ...r,
    submittedAt: r.submittedAt.toISOString(),
    // Only expose the approval token to admins
    approvalToken: isAdmin ? r.approvalToken : null,
  });

  const serializeRejected = (r: (typeof rejectedCourses)[number]) => ({
    ...r,
    submittedAt: r.submittedAt.toISOString(),
  });

  const serializeRevoked = (r: (typeof revokedCourses)[number]) => ({
    ...r,
    submittedAt: r.submittedAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() || null,
    revokedAttemptsCount: r.attempts.length,
  });

  return (
    <ManageCoursesClient
      pendingCourses={pendingCourses.map(serializePending)}
      rejectedCourses={rejectedCourses.map(serializeRejected)}
      revokedCourses={revokedCourses.map(serializeRevoked)}
      isAdmin={isAdmin}
    />
  );
}
