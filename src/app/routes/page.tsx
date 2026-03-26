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
import { RigIcon } from "@/components/RigIcon";
import { PageHeader } from "@/components/PageHeader";

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
function getBestFktForRig(attempts: { rigSize: string; id: string; durationSec: number }[], rigSize: string) {
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
    <>
      <PageHeader
        title="All Routes"
        description={`${routes.length} approved route${routes.length !== 1 ? "s" : ""}${region ? ` in ${REGION_LABELS[region]}` : ""}`}
        actions={
          <Button asChild>
            <Link href="/routes/submit">Submit a Route</Link>
          </Button>
        }
      />
      <div className="container mx-auto px-4 py-8">

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
                <TableHead className="text-center">
                  <div className="flex justify-center" title="Aero 5">
                    <RigIcon rigSize="AERO_5" size={28} />
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex justify-center" title="Aero 6">
                    <RigIcon rigSize="AERO_6" size={28} />
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex justify-center" title="Aero 7">
                    <RigIcon rigSize="AERO_7" size={28} />
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex justify-center" title="Aero 9">
                    <RigIcon rigSize="AERO_9" size={28} />
                  </div>
                </TableHead>
                <TableHead>Submit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/routes/${route.id}`}
                      className="text-primary underline hover:no-underline text-sm"
                    >
                      {route.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{route.startName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{route.endName}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {(() => {
                      const fkt = getBestFktForRig(route.attempts, 'AERO_5');
                      return fkt ? (
                        <Link
                          href={`/attempts/${fkt.id}`}
                          className="font-mono text-sm font-semibold text-primary underline hover:no-underline"
                        >
                          {formatDuration(fkt.durationSec)}
                        </Link>
                      ) : <span className="text-muted-foreground text-sm">—</span>;
                    })()}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {(() => {
                      const fkt = getBestFktForRig(route.attempts, 'AERO_6');
                      return fkt ? (
                        <Link
                          href={`/attempts/${fkt.id}`}
                          className="font-mono text-sm font-semibold text-primary underline hover:no-underline"
                        >
                          {formatDuration(fkt.durationSec)}
                        </Link>
                      ) : <span className="text-muted-foreground text-sm">—</span>;
                    })()}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {(() => {
                      const fkt = getBestFktForRig(route.attempts, 'AERO_7');
                      return fkt ? (
                        <Link
                          href={`/attempts/${fkt.id}`}
                          className="font-mono text-sm font-semibold text-primary underline hover:no-underline"
                        >
                          {formatDuration(fkt.durationSec)}
                        </Link>
                      ) : <span className="text-muted-foreground text-sm">—</span>;
                    })()}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {(() => {
                      const fkt = getBestFktForRig(route.attempts, 'AERO_9');
                      return fkt ? (
                        <Link
                          href={`/attempts/${fkt.id}`}
                          className="font-mono text-sm font-semibold text-primary underline hover:no-underline"
                        >
                          {formatDuration(fkt.durationSec)}
                        </Link>
                      ) : <span className="text-muted-foreground text-sm">—</span>;
                    })()}
                  </TableCell>
                  <TableCell className="py-1">
                    <Button asChild size="sm" variant="outline" className="text-xs h-6 px-2 py-0">
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
    </>
  );
}
