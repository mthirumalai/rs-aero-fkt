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
      <section className="bg-primary text-white py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="font-display mb-4 tracking-widest uppercase whitespace-nowrap text-[clamp(1.8rem,5.5vw,4.5rem)]">
            RS Aero Fastest Known Times
          </h1>
          <p className="text-lg text-white/80 mb-8 font-sans">
            The definitive record of the fastest passages made by an RS Aero for classic sailing routes.
            <br />
            Got a route? Got a GPX track for that route? Let&apos;s put it in the books!
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">
              <Link href="/routes/submit">Submit a Route</Link>
            </Button>
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">
              <Link href="/routes">Submit an FKT Attempt</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FKT Table */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-4xl tracking-wide uppercase">All Known FKTs</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/routes">All Routes →</Link>
          </Button>
        </div>

        <FktLandingTable data={tableData} />
      </section>
    </div>
  );
}
