"use client";

import { useState } from "react";
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
import type { RigSize } from "@prisma/client";
import { RigIcon } from "@/components/RigIcon";

interface Attempt {
  id: string;
  rigSize: RigSize;
  date: Date;
  durationSec: number;
  avgSogKnots: number | null;
  maxSogKnots: number | null;
  athlete: { id: string; name: string | null };
}


type SortKey = "date" | "durationSec" | "rigSize" | "athlete";
type SortDir = "asc" | "desc";

export function FktAttemptsTable({ attempts }: { attempts: Attempt[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("durationSec");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...attempts].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "date") {
      cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortKey === "durationSec") {
      cmp = a.durationSec - b.durationSec;
    } else if (sortKey === "rigSize") {
      cmp = a.rigSize.localeCompare(b.rigSize);
    } else if (sortKey === "athlete") {
      cmp = (a.athlete.name ?? "").localeCompare(b.athlete.name ?? "");
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function SortHeader({
    label,
    field,
  }: {
    label: string;
    field: SortKey;
  }) {
    return (
      <TableHead
        className="cursor-pointer select-none hover:bg-muted/50"
        onClick={() => handleSort(field)}
      >
        {label}
        {sortKey === field && (
          <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
        )}
      </TableHead>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        No FKT attempts yet. Be the first to submit one!
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader label="Date" field="date" />
            <SortHeader label="Rig Size" field="rigSize" />
            <SortHeader label="Time" field="durationSec" />
            <SortHeader label="Athlete" field="athlete" />
            <TableHead>Avg SOG</TableHead>
            <TableHead>Max SOG</TableHead>
            <TableHead>FKT</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((attempt) => (
            <TableRow key={attempt.id}>
              <TableCell>
                {new Date(attempt.date).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex justify-center">
                  <RigIcon rigSize={attempt.rigSize} size={24} />
                </div>
              </TableCell>
              <TableCell className="font-mono font-semibold">
                {formatDuration(attempt.durationSec)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/athletes/${attempt.athlete.id}`}
                  className="text-primary underline hover:no-underline"
                >
                  {attempt.athlete.name ?? "Unknown"}
                </Link>
              </TableCell>
              <TableCell>
                {attempt.avgSogKnots != null
                  ? `${attempt.avgSogKnots.toFixed(1)} kts`
                  : "—"}
              </TableCell>
              <TableCell>
                {attempt.maxSogKnots != null
                  ? `${attempt.maxSogKnots.toFixed(1)} kts`
                  : "—"}
              </TableCell>
              <TableCell>
                <Link
                  href={`/attempts/${attempt.id}`}
                  className="text-primary underline hover:no-underline text-sm"
                >
                  View →
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
