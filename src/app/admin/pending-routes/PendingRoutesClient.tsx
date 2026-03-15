"use client";

import { useState } from "react";
import Link from "next/link";
import { COUNTRY_NAMES } from "@/lib/regions";
import { distanceNm } from "@/lib/gpx/validator";
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

type RouteRow = {
  id: string;
  name: string;
  country: string;
  startName: string;
  startLat: number;
  startLng: number;
  endName: string;
  endLat: number;
  endLng: number;
  submittedAt: string;
  submittedBy: { name: string | null; email: string | null };
  approvalToken?: string | null;
  rejectionReason?: string | null;
};

interface Props {
  pendingRoutes: RouteRow[];
  rejectedRoutes: RouteRow[];
  isAdmin: boolean;
}

export function PendingRoutesClient({ pendingRoutes, rejectedRoutes, isAdmin }: Props) {
  const [selectedRejected, setSelectedRejected] = useState<RouteRow | null>(null);
  const [reopeningRoute, setReopeningRoute] = useState<string | null>(null);

  const handleReOpen = async (routeId: string) => {
    setReopeningRoute(routeId);
    try {
      const response = await fetch(`/api/routes/${routeId}/reopen`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to re-open route: ${error.message || 'Unknown error'}`);
        return;
      }

      // Refresh the page to show updated status
      window.location.reload();
    } catch {
      alert('Network error while re-opening route');
    } finally {
      setReopeningRoute(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <h1 className="font-display text-5xl uppercase tracking-wide mb-10">Route Submissions</h1>

      {/* PENDING TABLE */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold">Awaiting Approval</h2>
          <Badge variant="secondary">{pendingRoutes.length}</Badge>
        </div>
        {pendingRoutes.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center border rounded-lg">
            No routes pending approval.
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  {isAdmin && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRoutes.map((route) => (
                  <TableRow
                    key={route.id}
                    className={isAdmin && route.approvalToken ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => {
                      if (isAdmin && route.approvalToken) {
                        window.location.href = `/admin/approve-route?token=${route.approvalToken}`;
                      }
                    }}
                  >
                    <TableCell>
                      <div className="font-medium">{route.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {route.startName} → {route.endName}
                      </div>
                    </TableCell>
                    <TableCell>{COUNTRY_NAMES[route.country] ?? route.country}</TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">
                      {distanceNm(route.startLat, route.startLng, route.endLat, route.endLng)} nm
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{route.submittedBy.name}</div>
                      <div className="text-xs text-muted-foreground">{route.submittedBy.email}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(route.submittedAt).toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {route.approvalToken ? (
                          <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap">
                            <Link href={`/admin/approve-route?token=${route.approvalToken}`}>
                              Review →
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No token</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* REJECTED TABLE */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold">Rejected</h2>
          <Badge variant="destructive">{rejectedRoutes.length}</Badge>
        </div>
        {rejectedRoutes.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center border rounded-lg">
            No rejected routes.
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Rejection Reason</TableHead>
                  {isAdmin && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedRoutes.map((route) => (
                  <TableRow
                    key={route.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedRejected(route)}
                  >
                    <TableCell>
                      <div className="font-medium">{route.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {route.startName} → {route.endName}
                      </div>
                    </TableCell>
                    <TableCell>{COUNTRY_NAMES[route.country] ?? route.country}</TableCell>
                    <TableCell>
                      <div className="text-sm">{route.submittedBy.name}</div>
                      <div className="text-xs text-muted-foreground">{route.submittedBy.email}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(route.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground truncate">
                        {route.rejectionReason ?? "—"}
                      </p>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 text-white whitespace-nowrap"
                          onClick={() => handleReOpen(route.id)}
                          disabled={reopeningRoute === route.id}
                        >
                          {reopeningRoute === route.id ? "Re-Opening..." : "Re-Open"}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* REJECTION DETAIL MODAL */}
      {selectedRejected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedRejected(null)}
        >
          <div
            className="bg-background rounded-lg border shadow-lg max-w-lg w-full mx-4 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Rejected Route
              </p>
              <h3 className="text-xl font-semibold">{selectedRejected.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {selectedRejected.startName} → {selectedRejected.endName}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Reason for Rejection
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {selectedRejected.rejectionReason ?? "No reason provided."}
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedRejected(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
