import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDuration } from "@/lib/gpx/parser";
import { distanceNm } from "@/lib/gpx/validator";
import { DistanceTraveledStat } from "@/components/stats/DistanceTraveledStat";
import { TrackPlayback } from "@/components/playback/TrackPlayback";
import { RigIcon } from "@/components/RigIcon";
import { AttemptPhotosSection } from "@/components/AttemptPhotosSection";
import { auth } from "@/lib/auth";

interface Props {
  params: { attemptId: string };
}


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
  const [session, attempt] = await Promise.all([
    auth(),
    prisma.fktAttempt.findUnique({
      where: { id: params.attemptId, status: "APPROVED" },
      include: {
        route: true,
        athlete: { select: { id: true, name: true, image: true } },
        photos: true,
      },
    }),
  ]);

  if (!attempt) notFound();

  // Check if user can upload photos (athlete or sailor)
  const canUploadPhotos = session?.user?.id && (
    session.user.id === attempt.athleteId ||
    (session.user.email && attempt.sailorEmail && session.user.email === attempt.sailorEmail)
  );

  // Get all approved attempts for this route and rig to determine ranking
  const allAttemptsForRouteRig = await prisma.fktAttempt.findMany({
    where: {
      routeId: attempt.routeId,
      rigSize: attempt.rigSize,
      status: "APPROVED",
    },
    orderBy: { durationSec: "asc" },
    select: { id: true, durationSec: true },
  });

  // Find the ranking of this attempt
  const attemptRanking = allAttemptsForRouteRig.findIndex(a => a.id === attempt.id) + 1;

  // Format ranking text
  const getRankingText = (rank: number) => {
    if (rank === 1) return "Fastest time";
    if (rank === 2) return "2nd fastest time";
    if (rank === 3) return "3rd fastest time";
    return `${rank}th fastest time`;
  };

  return (
    <div className="container mx-auto px-4 py-8">

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">FKT Attempt</h1>
        <p className="text-xl text-muted-foreground">
          Route: <span className="text-foreground">{attempt.route.name}</span>, {new Date(attempt.date).toLocaleDateString("en-GB", {
            day: "numeric", month: "long", year: "numeric",
          })} by <Link
            href={`/athletes/${attempt.athlete.id}`}
            className="text-primary hover:underline"
          >
            {attempt.athlete.name}
          </Link>. Rig: <RigIcon rigSize={attempt.rigSize} size={24} className="inline-block" />
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">Elapsed Time</p>
          <p className="text-2xl font-mono">
            {formatDuration(attempt.durationSec)}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">Ranking</p>
          <p className="text-2xl">
            {getRankingText(attemptRanking)}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">Great Circle Distance</p>
          <p className="text-2xl">
            {distanceNm(attempt.route.startLat, attempt.route.startLng, attempt.route.endLat, attempt.route.endLng)} nm
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">Distance Traveled</p>
          <p className="text-2xl">
            <DistanceTraveledStat attemptId={attempt.id} />
          </p>
        </div>
        {attempt.avgSogKnots != null && (
          <div className="bg-card border rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Avg SOG</p>
            <p className="text-2xl">{attempt.avgSogKnots.toFixed(1)} kts</p>
          </div>
        )}
        {attempt.maxSogKnots != null && (
          <div className="bg-card border rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Max SOG</p>
            <p className="text-2xl">{attempt.maxSogKnots.toFixed(1)} kts</p>
          </div>
        )}
        {attempt.windSpeedKnots != null && (
          <div className="bg-card border rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Wind</p>
            <p className="text-2xl">
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
        <TrackPlayback
          attemptId={attempt.id}
        />
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
      <AttemptPhotosSection
        initialPhotos={attempt.photos}
        attemptId={attempt.id}
        canUploadPhotos={!!canUploadPhotos}
      />
    </div>
  );
}
