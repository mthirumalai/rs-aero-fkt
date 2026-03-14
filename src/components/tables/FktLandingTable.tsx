"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/gpx/parser";
import { COUNTRY_NAMES } from "@/lib/regions";
import type { Route, RigSize } from "@prisma/client";

type FktEntry = {
  durationSec: number;
  sailorName: string;
  sailorAthleteId: string | null;
  attemptId: string;
  isRegisteredSailor: boolean;
};

type RowData = {
  route: Route;
  fktsByRig: Partial<Record<RigSize, FktEntry>>;
};

export function FktLandingTable({ data }: { data: RowData[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No FKTs recorded yet.{" "}
        <Link href="/routes/submit" className="text-primary hover:underline">
          Submit the first route!
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[140px] max-w-[200px]">Route</TableHead>
            <TableHead>Country</TableHead>
            <TableHead className="text-center">Aero 5</TableHead>
            <TableHead className="text-center">Aero 6</TableHead>
            <TableHead className="text-center">Aero 7</TableHead>
            <TableHead className="text-center">Aero 9</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(({ route, fktsByRig }) => (
            <TableRow key={route.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/routes/${route.id}`}
                  className="text-primary underline hover:no-underline"
                >
                  {route.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {COUNTRY_NAMES[route.country] ?? route.country}
                </Badge>
              </TableCell>
              {(["AERO_5", "AERO_6", "AERO_7", "AERO_9"] as RigSize[]).map((rig) => {
                const fkt = fktsByRig[rig];
                return (
                  <TableCell key={rig} className="text-center">
                    {fkt ? (
                      <div className="whitespace-nowrap">
                        <Link
                          href={`/attempts/${fkt.attemptId}`}
                          className="font-mono text-sm font-semibold text-primary underline hover:no-underline"
                        >
                          {formatDuration(fkt.durationSec)}
                        </Link>
                        {" by "}
                        {fkt.isRegisteredSailor && fkt.sailorAthleteId ? (
                          <Link
                            href={`/athletes/${fkt.sailorAthleteId}`}
                            className="text-xs text-muted-foreground underline hover:no-underline"
                          >
                            {fkt.sailorName}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {fkt.sailorName}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
