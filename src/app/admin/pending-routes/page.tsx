import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PendingRoutesClient } from "./PendingRoutesClient";

export const metadata = { title: "Route Submissions — RS Aero FKT" };

export default async function PendingRoutesPage() {
  const session = await auth();
  const isAdmin = !!session?.user?.email && session.user.email === process.env.ADMIN_EMAIL;

  const [pendingRoutes, rejectedRoutes] = await Promise.all([
    prisma.route.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        name: true,
        country: true,
        startName: true,
        startLat: true,
        startLng: true,
        endName: true,
        endLat: true,
        endLng: true,
        submittedAt: true,
        approvalToken: true,
        submittedBy: { select: { name: true, email: true } },
      },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.route.findMany({
      where: { status: "REJECTED" },
      select: {
        id: true,
        name: true,
        country: true,
        startName: true,
        startLat: true,
        startLng: true,
        endName: true,
        endLat: true,
        endLng: true,
        submittedAt: true,
        rejectionReason: true,
        submittedBy: { select: { name: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  const serializePending = (r: (typeof pendingRoutes)[number]) => ({
    ...r,
    submittedAt: r.submittedAt.toISOString(),
    // Only expose the approval token to admins
    approvalToken: isAdmin ? r.approvalToken : null,
  });

  const serializeRejected = (r: (typeof rejectedRoutes)[number]) => ({
    ...r,
    submittedAt: r.submittedAt.toISOString(),
  });

  return (
    <PendingRoutesClient
      pendingRoutes={pendingRoutes.map(serializePending)}
      rejectedRoutes={rejectedRoutes.map(serializeRejected)}
      isAdmin={isAdmin}
    />
  );
}
