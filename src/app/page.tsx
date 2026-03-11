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

export default async function HomePage() {
  const tableData = await getFktTableData();

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-sky-700 to-sky-900 text-white py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold mb-4">RS Aero Fastest Known Times</h1>
          <p className="text-xl text-sky-100 mb-8">
            The definitive record of the fastest known times for RS Aero sailing routes worldwide.
            Submit your routes and GPX-verified FKT attempts across all four rig sizes.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild size="lg" className="bg-white text-sky-800 hover:bg-sky-50">
              <Link href="/routes/submit">Submit a Route</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-sky-800"
            >
              <Link href="/routes">Browse Routes</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FKT Table */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">All Known FKTs</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/routes">All Routes →</Link>
          </Button>
        </div>

        <FktLandingTable data={tableData} />
      </section>
    </div>
  );
}
