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
import { Badge } from "@/components/ui/badge";
import { RegionFilter } from "@/components/RegionFilter";
import { COUNTRY_NAMES, getCountriesForRegion, REGION_LABELS, type Region } from "@/lib/regions";

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
      _count: { select: { attempts: { where: { status: "APPROVED" } } } },
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
        <Button asChild className="bg-sky-700 hover:bg-sky-800">
          <Link href="/routes/submit">Submit a Route</Link>
        </Button>
      </div>

      <RegionFilter currentRegion={region} />

      {routes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No routes found.{" "}
          <Link href="/routes/submit" className="text-sky-600 hover:underline">
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
                <TableHead>Country</TableHead>
                <TableHead className="text-center">FKT Attempts</TableHead>
                <TableHead>Approved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/routes/${route.id}`}
                      className="text-sky-700 hover:underline"
                    >
                      {route.name}
                    </Link>
                  </TableCell>
                  <TableCell>{route.startName}</TableCell>
                  <TableCell>{route.endName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {COUNTRY_NAMES[route.country] ?? route.country}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {route._count.attempts}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {route.approvedAt
                      ? new Date(route.approvedAt).toLocaleDateString()
                      : "—"}
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
