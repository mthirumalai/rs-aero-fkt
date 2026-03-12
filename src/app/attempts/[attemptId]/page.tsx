import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/gpx/parser";
import { getPublicPhotoUrl as getPhotoUrl } from "@/lib/storage";
import { TrackPlayback } from "@/components/playback/TrackPlayback";

interface Props {
  params: { attemptId: string };
}

const RIG_LABELS: Record<string, string> = {
  AERO_5: "Aero 5",
  AERO_6: "Aero 6",
  AERO_7: "Aero 7",
  AERO_9: "Aero 9",
};

export async function generateMetadata({ params }: Props) {
  const attempt = await prisma.fktAttempt.findUnique({
    where: { id: params.attemptId },
    include: { route: true, athlete: true },
  });
  if (!attempt) return {};
  return {
    title: `${attempt.route.name} FKT by ${attempt.athlete.name} — RS Aero FKT`,
  };
}

export default async function AttemptDetailPage({ params }: Props) {
  const attempt = await prisma.fktAttempt.findUnique({
    where: { id: params.attemptId, status: "APPROVED" },
    include: {
      route: true,
      athlete: { select: { id: true, name: true, image: true } },
      photos: true,
    },
  });

  if (!attempt) notFound();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/routes" className="hover:underline">Routes</Link>
        <span>/</span>
        <Link href={`/routes/${attempt.route.id}`} className="hover:underline">
          {attempt.route.name}
        </Link>
        <span>/</span>
        <span>FKT Attempt</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{attempt.route.name}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">{RIG_LABELS[attempt.rigSize]}</Badge>
          <span className="text-muted-foreground">
            {new Date(attempt.date).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </span>
          <span className="text-muted-foreground">by</span>
          <Link
            href={`/athletes/${attempt.athlete.id}`}
            className="text-primary font-medium hover:underline"
          >
            {attempt.athlete.name}
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">Time</p>
          <p className="text-2xl font-bold font-mono">
            {formatDuration(attempt.durationSec)}
          </p>
        </div>
        {attempt.avgSogKnots != null && (
          <div className="bg-card border rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Avg SOG</p>
            <p className="text-2xl font-bold">{attempt.avgSogKnots.toFixed(1)} kts</p>
          </div>
        )}
        {attempt.maxSogKnots != null && (
          <div className="bg-card border rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Max SOG</p>
            <p className="text-2xl font-bold">{attempt.maxSogKnots.toFixed(1)} kts</p>
          </div>
        )}
        {attempt.windSpeedKnots != null && (
          <div className="bg-card border rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Wind</p>
            <p className="text-2xl font-bold">
              {attempt.windSpeedKnots.toFixed(0)} kts
              {attempt.windDirection && (
                <span className="text-lg ml-1">{attempt.windDirection}</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Conditions */}
      {(attempt.windSpeedKnots != null || attempt.windDirection || attempt.currentNotes) && (
        <div className="bg-card border rounded-lg p-4 mb-8">
          <h2 className="font-semibold mb-3">Conditions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {attempt.windSpeedKnots != null && (
              <div>
                <p className="text-muted-foreground">Wind Speed</p>
                <p className="font-medium">{attempt.windSpeedKnots} knots</p>
              </div>
            )}
            {attempt.windDirection && (
              <div>
                <p className="text-muted-foreground">Wind Direction</p>
                <p className="font-medium">{attempt.windDirection}</p>
              </div>
            )}
            {attempt.currentNotes && (
              <div>
                <p className="text-muted-foreground">Current / Tide</p>
                <p className="font-medium">{attempt.currentNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Track Playback */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Track Playback</h2>
        <TrackPlayback attemptId={attempt.id} />
      </div>

      {/* Write-up */}
      {attempt.writeUp && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Write-up</h2>
          <div className="prose prose-sm max-w-none bg-card border rounded-lg p-6">
            {attempt.writeUp.split("\n").map((para, i) => (
              <p key={i} className="mb-3 last:mb-0">
                {para}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Track source link */}
      {attempt.trackSourceUrl && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Track Source</h2>
          <a
            href={attempt.trackSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {attempt.trackSourceUrl}
          </a>
        </div>
      )}

      {/* Photos */}
      {attempt.photos.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Photos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attempt.photos.map((photo) => (
              <div key={photo.id} className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={getPhotoUrl(photo.s3Key)}
                  alt={photo.caption ?? "Attempt photo"}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
