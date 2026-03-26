import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { FktLandingTable } from "@/components/tables/FktLandingTable";
import { PageHeader } from "@/components/PageHeader";
import type { RigSize } from "@prisma/client";

const RIG_SIZES: RigSize[] = ["AERO_5", "AERO_6", "AERO_7", "AERO_9"];

async function getFktTableData() {
  // Get all approved routes with their best (fastest) approved attempt per rig size
  const routes = await prisma.route.findMany({
    where: { status: "APPROVED" },
    orderBy: { approvedAt: "desc" },
    include: {
      attempts: {
        where: { status: "APPROVED" },
        orderBy: { durationSec: "asc" },
        select: {
          id: true,
          durationSec: true,
          rigSize: true,
          sailorName: true,
          sailorEmail: true,
          athlete: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
        },
      },
    },
  });

  // Get all registered athletes to check if sailors are registered
  const allAthletes = await prisma.user.findMany({
    select: { id: true, email: true }
  });
  const athleteEmailMap = new Map(allAthletes.map(a => [a.email, a.id]));

  return routes.map((route) => {
    const fktsByRig: Partial<
      Record<
        RigSize,
        {
          durationSec: number;
          sailorName: string;
          sailorAthleteId: string | null;
          attemptId: string;
          isRegisteredSailor: boolean;
        }
      >
    > = {};

    for (const rigSize of RIG_SIZES) {
      const best = route.attempts.find((a) => a.rigSize === rigSize);
      if (best) {
        // Use sailor name if available, otherwise fall back to athlete name
        const sailorName = best.sailorName || best.athlete.name || "Unknown";
        const sailorEmail = best.sailorEmail || best.athlete.email;
        const sailorAthleteId = sailorEmail ? athleteEmailMap.get(sailorEmail) || null : null;

        fktsByRig[rigSize] = {
          durationSec: best.durationSec,
          sailorName,
          sailorAthleteId,
          attemptId: best.id,
          isRegisteredSailor: !!sailorAthleteId,
        };
      }
    }

    return { route, fktsByRig };
  });
}

export default async function FktsPage() {
  const tableData = await getFktTableData();

  return (
    <>
      <PageHeader
        title="All Known FKTs"
        description="Fastest Known Times across all routes and rig sizes"
        actions={
          <Button asChild>
            <Link href="/routes/submit">Submit a Route</Link>
          </Button>
        }
      />
      <div className="container mx-auto px-4 py-8">
        <FktLandingTable data={tableData} />
      </div>
    </>
  );
}