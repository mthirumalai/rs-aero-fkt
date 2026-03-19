"use client";

import { useState } from "react";
import Link from "next/link";
import { COUNTRY_NAMES } from "@/lib/regions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RigIcon } from "@/components/RigIcon";

type FailedAttempt = {
  id: string;
  routeId: string;
  rigSize: string;
  date: string;
  gpxS3Key: string;
  writeUp: string | null; // Contains failure reason
  sailorName: string | null;
  sailorEmail: string | null;
  submittedAt: string;
  route: {
    name: string;
    country: string;
  };
  athlete: {
    name: string | null;
    email: string | null;
  };
};

interface Props {
  failedAttempts: FailedAttempt[];
  isAdmin: boolean;
}

export function FktFailuresClient({ failedAttempts, isAdmin }: Props) {
  const [selectedFailure, setSelectedFailure] = useState<FailedAttempt | null>(null);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <h1 className="font-display text-5xl uppercase tracking-wide mb-10">FKT Failures</h1>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold">Failed FKT Submissions</h2>
          <Badge variant="destructive">{failedAttempts.length}</Badge>
        </div>

        {failedAttempts.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center border rounded-lg">
            No failed FKT submissions.
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Route</TableHead>
                    <TableHead className="w-24">Country</TableHead>
                    <TableHead className="w-24">Rig Size</TableHead>
                    <TableHead className="w-32">Sailor</TableHead>
                    <TableHead className="w-32">Submitter</TableHead>
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead className="w-40">Failure Reason</TableHead>
                    <TableHead className="w-28">GPX File</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedAttempts.map((attempt) => (
                    <TableRow
                      key={attempt.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedFailure(attempt)}
                    >
                      <TableCell className="w-48">
                        <div className="font-medium truncate" title={attempt.route.name}>
                          {attempt.route.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(attempt.submittedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="w-24 truncate" title={COUNTRY_NAMES[attempt.route.country] ?? attempt.route.country}>
                        {COUNTRY_NAMES[attempt.route.country] ?? attempt.route.country}
                      </TableCell>
                      <TableCell className="w-24">
                        <div className="flex justify-center">
                          <RigIcon rigSize={attempt.rigSize as "AERO_5" | "AERO_6" | "AERO_7" | "AERO_9"} size={24} />
                        </div>
                      </TableCell>
                      <TableCell className="w-32">
                        <div className="text-sm truncate" title={attempt.sailorName ?? ''}>
                          {attempt.sailorName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate" title={attempt.sailorEmail ?? ''}>
                          {attempt.sailorEmail}
                        </div>
                      </TableCell>
                      <TableCell className="w-32">
                        <div className="text-sm truncate" title={attempt.athlete.name ?? ''}>
                          {attempt.athlete.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate" title={attempt.athlete.email ?? ''}>
                          {attempt.athlete.email}
                        </div>
                      </TableCell>
                      <TableCell className="w-32 text-sm text-muted-foreground">
                        {new Date(attempt.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="w-40">
                        <p className="text-sm text-muted-foreground truncate cursor-help" title={attempt.writeUp ?? "No reason provided"}>
                          {attempt.writeUp ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="w-28" onClick={(e) => e.stopPropagation()}>
                        <Button asChild size="sm" variant="outline" className="whitespace-nowrap min-w-[80px]">
                          <Link href={`/api/attempts/${attempt.id}/gpx`} target="_blank">
                            View GPX →
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>

      {/* FAILURE DETAIL MODAL */}
      {selectedFailure && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedFailure(null)}
        >
          <div
            className="bg-background rounded-lg border shadow-lg max-w-2xl w-full mx-4 p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Failed FKT Submission
              </p>
              <h3 className="text-xl font-semibold">{selectedFailure.route.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <RigIcon rigSize={selectedFailure.rigSize as "AERO_5" | "AERO_6" | "AERO_7" | "AERO_9"} size={18} />
                <span>• {new Date(selectedFailure.date).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">Sailor</p>
                <p>{selectedFailure.sailorName}</p>
                <p className="text-muted-foreground text-xs">{selectedFailure.sailorEmail}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Submitted by</p>
                <p>{selectedFailure.athlete.name}</p>
                <p className="text-muted-foreground text-xs">{selectedFailure.athlete.email}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Failure Reason
              </p>
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedFailure.writeUp ?? "No failure reason recorded."}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button asChild variant="outline">
                <Link href={`/api/attempts/${selectedFailure.id}/gpx`} target="_blank">
                  Download GPX
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/routes/${selectedFailure.routeId}`}>
                  View Route
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setSelectedFailure(null)} className="ml-auto">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}