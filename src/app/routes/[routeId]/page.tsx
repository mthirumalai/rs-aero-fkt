import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { COUNTRY_NAMES } from "@/lib/regions";
import { RouteMap } from "@/components/map/RouteMap";
import { FktAttemptsTable } from "@/components/tables/FktAttemptsTable";
import { getPhotoUrl } from "@/lib/s3";

interface Props {
  params: { routeId: string };
}

export async function generateMetadata({ params }: Props) {
  const route = await prisma.route.findUnique({ where: { id: params.routeId } });
  if (!route) return {};
  return { title: `${route.name} — RS Aero FKT` };
}

export default async function RouteDetailPage({ params }: Props) {
  const route = await prisma.route.findUnique({
    where: { id: params.routeId, status: "APPROVED" },
    include: {
      submittedBy: { select: { id: true, name: true } },
      photos: true,
      attempts: {
        where: { status: "APPROVED" },
        orderBy: { durationSec: "asc" },
        include: { athlete: { select: { id: true, name: true } } },
      },
    },
  });

  if (!route) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/routes" className="hover:underline">Routes</Link>
            <span>/</span>
            <span>{route.name}</span>
          </div>
          <h1 className="text-3xl font-bold">{route.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="secondary">
              {COUNTRY_NAMES[route.country] ?? route.country}
            </Badge>
            {route.approvedAt && (
              <span className="text-sm text-muted-foreground">
                Approved {new Date(route.approvedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <Button asChild className="bg-sky-700 hover:bg-sky-800">
          <Link href={`/routes/${route.id}/submit-fkt`}>Submit an FKT</Link>
        </Button>
      </div>

      {/* Description */}
      {route.description && (
        <p className="text-muted-foreground mb-6">{route.description}</p>
      )}

      {/* Route Details + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <div className="border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold">Route Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Start</p>
                <p className="font-medium">{route.startName}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {route.startLat.toFixed(6)}, {route.startLng.toFixed(6)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">End</p>
                <p className="font-medium">{route.endName}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {route.endLat.toFixed(6)}, {route.endLng.toFixed(6)}
                </p>
              </div>
            </div>
            {route.distanceKm && (
              <div className="text-sm">
                <span className="text-muted-foreground">Distance: </span>
                <span className="font-medium">{route.distanceKm.toFixed(1)} km</span>
              </div>
            )}
            <div className="text-sm">
              <span className="text-muted-foreground">Submitted by: </span>
              <Link
                href={`/athletes/${route.submittedBy.id}`}
                className="font-medium text-sky-700 hover:underline"
              >
                {route.submittedBy.name}
              </Link>
            </div>
          </div>
        </div>

        <div className="h-[300px] lg:h-auto min-h-[300px] rounded-lg overflow-hidden border">
          <RouteMap
            startLat={route.startLat}
            startLng={route.startLng}
            endLat={route.endLat}
            endLng={route.endLng}
            startName={route.startName}
            endName={route.endName}
          />
        </div>
      </div>

      {/* Photos */}
      {route.photos.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Route Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {route.photos.map((photo) => (
              <div key={photo.id} className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={getPhotoUrl(photo.s3Key)}
                  alt={photo.caption ?? "Route photo"}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FKT Attempts Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">FKT Attempts</h2>
        <FktAttemptsTable attempts={route.attempts} />
      </div>
    </div>
  );
}
