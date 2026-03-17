import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { FktFailuresClient } from "./FktFailuresClient";

export const metadata = { title: "FKT Failures — RS Aero FKT" };

export default async function FktFailuresPage() {
  const session = await auth();
  const isAdmin = !!session?.user?.email && session.user.email === process.env.ADMIN_EMAIL;

  // Debug logging for admin access
  console.log('🔍 FKT Failures Admin Check:', {
    userEmail: session?.user?.email,
    adminEmailEnvVar: process.env.ADMIN_EMAIL,
    isAdmin: isAdmin
  });

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">You need admin privileges to view this page.</p>
      </div>
    );
  }

  const failedAttempts = await prisma.fktAttempt.findMany({
    where: { status: "REJECTED" },
    select: {
      id: true,
      routeId: true,
      rigSize: true,
      date: true,
      gpxS3Key: true,
      writeUp: true, // Contains failure reason
      sailorName: true,
      sailorEmail: true,
      submittedAt: true,
      route: {
        select: {
          name: true,
          country: true,
        }
      },
      athlete: {
        select: {
          name: true,
          email: true,
        }
      }
    },
    orderBy: { submittedAt: "desc" },
  });

  const serializedFailures = failedAttempts.map(attempt => ({
    ...attempt,
    date: attempt.date.toISOString(),
    submittedAt: attempt.submittedAt.toISOString(),
  }));

  return (
    <FktFailuresClient
      failedAttempts={serializedFailures}
      isAdmin={isAdmin}
    />
  );
}