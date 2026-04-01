import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PendingCoursesClient } from "./PendingCoursesClient";

export const metadata = { title: "Course Submissions — RS Aero FKT" };

export default async function PendingCoursesPage() {
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

  const [pendingCourses, rejectedCourses] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        name: true,
        country: true,
        startName: true,
        startLat: true,
        startLng: true,
        finishName: true,
        finishLat: true,
        finishLng: true,
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
        startName: true,
        startLat: true,
        startLng: true,
        finishName: true,
        finishLat: true,
        finishLng: true,
        submittedAt: true,
        rejectionReason: true,
        submittedBy: { select: { name: true, email: true } },
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

  return (
    <PendingCoursesClient
      pendingCourses={pendingCourses.map(serializePending)}
      rejectedCourses={rejectedCourses.map(serializeRejected)}
      isAdmin={isAdmin}
    />
  );
}
