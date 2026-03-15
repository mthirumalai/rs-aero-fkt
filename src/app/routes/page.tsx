import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RegionFilter } from "@/components/RegionFilter";
import { getCountriesForRegion, REGION_LABELS, type Region } from "@/lib/regions";

// Utility function to format duration in seconds to readable time
function formatDuration(durationSec: number): string {
  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const seconds = durationSec % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Get the best FKT for a specific rig size
function getBestFktForRig(attempts: any[], rigSize: string) {
  return attempts.find(attempt => attempt.rigSize === rigSize);
}

interface Props {
  searchParams: { region?: string };
}

export default async function RoutesPage({ searchParams }: Props) {
  const regionParam = searchParams.region;
  const region = (regionParam && regionParam !== "all") ? regionParam as Region : undefined;

  const where: Record<string, unknown> = { status: "APPROVED" };
  if (region) {
    const countries = getCountriesForRegion(region);
    where.country = { in: countries };
  }

  const routes = await prisma.route.findMany({
    where,
    orderBy: { approvedAt: "desc" },
    include: {
      attempts: {
        where: { status: "APPROVED" },
        orderBy: { durationSec: "asc" },
        distinct: ["rigSize"],
        select: {
          id: true,
          rigSize: true,
          durationSec: true,
          athlete: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">All Routes</h1>
          <p className="text-muted-foreground mt-1">
            {routes.length} approved route{routes.length !== 1 ? "s" : ""}
            {region ? ` in ${REGION_LABELS[region]}` : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/routes/submit">Submit a Route</Link>
        </Button>
      </div>

      <RegionFilter currentRegion={region} />

      {routes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No routes found.{" "}
          <Link href="/routes/submit" className="text-primary underline hover:no-underline">
            Be the first to submit one!
          </Link>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Route</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-center">5 Rig</TableHead>
                <TableHead className="text-center">6 Rig</TableHead>
                <TableHead className="text-center">7 Rig</TableHead>
                <TableHead className="text-center">9 Rig</TableHead>
                <TableHead>Submit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/routes/${route.id}`}
                      className="text-primary underline hover:no-underline"
                    >
                      {route.name}
                    </Link>
                  </TableCell>
                  <TableCell>{route.startName}</TableCell>
                  <TableCell>{route.endName}</TableCell>
                  <TableCell className="text-center text-sm">
                    {(() => {
                      const fkt = getBestFktForRig(route.attempts, 'AERO_5');
                      return fkt ? (
                        <Link
                          href={`/attempts/${fkt.id}`}
                          className="text-primary underline hover:no-underline"
                        >
                          {formatDuration(fkt.durationSec)}
                        </Link>
                      ) : '—';
                    })()}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {(() => {
                      const fkt = getBestFktForRig(route.attempts, 'AERO_6');
                      return fkt ? (
                        <Link
                          href={`/attempts/${fkt.id}`}
                          className="text-primary underline hover:no-underline"
                        >
                          {formatDuration(fkt.durationSec)}
                        </Link>
                      ) : '—';
                    })()}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {(() => {
                      const fkt = getBestFktForRig(route.attempts, 'AERO_7');
                      return fkt ? (
                        <Link
                          href={`/attempts/${fkt.id}`}
                          className="text-primary underline hover:no-underline"
                        >
                          {formatDuration(fkt.durationSec)}
                        </Link>
                      ) : '—';
                    })()}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {(() => {
                      const fkt = getBestFktForRig(route.attempts, 'AERO_9');
                      return fkt ? (
                        <Link
                          href={`/attempts/${fkt.id}`}
                          className="text-primary underline hover:no-underline"
                        >
                          {formatDuration(fkt.durationSec)}
                        </Link>
                      ) : '—';
                    })()}
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/routes/${route.id}/submit-fkt`}>
                        Submit FKT
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
