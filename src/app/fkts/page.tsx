import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { FktLandingTable } from "@/components/tables/FktLandingTable";
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
        include: { athlete: { select: { id: true, name: true } } },
      },
    },
  });

  return routes.map((route) => {
    const fktsByRig: Partial<
      Record<
        RigSize,
        { durationSec: number; athleteId: string; athleteName: string; attemptId: string }
      >
    > = {};

    for (const rigSize of RIG_SIZES) {
      const best = route.attempts.find((a) => a.rigSize === rigSize);
      if (best) {
        fktsByRig[rigSize] = {
          durationSec: best.durationSec,
          athleteId: best.athlete.id,
          athleteName: best.athlete.name ?? "Unknown",
          attemptId: best.id,
        };
      }
    }

    return { route, fktsByRig };
  });
}

export default async function FktsPage() {
  const tableData = await getFktTableData();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">All Known FKTs</h1>
          <p className="text-muted-foreground mt-1">
            Fastest Known Times across all routes and rig sizes
          </p>
        </div>
        <Button asChild>
          <Link href="/routes/submit">Submit a Route</Link>
        </Button>
      </div>

      <FktLandingTable data={tableData} />
    </div>
  );
}