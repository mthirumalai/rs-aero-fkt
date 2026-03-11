"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { parseGpxXml, type GpxPoint } from "@/lib/gpx/parser";
import { computeSog, type SogPoint } from "@/lib/gpx/sog";

const TrackMapDynamic = dynamic(() => import("../map/TrackMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
      Loading map...
    </div>
  ),
});

const SogChart = dynamic(() => import("../charts/SogChart"), { ssr: false });

interface Props {
  attemptId: string;
}

const SPEED_OPTIONS = [1, 2, 5, 10] as const;
type SpeedMultiplier = (typeof SPEED_OPTIONS)[number];

export function TrackPlayback({ attemptId }: Props) {
  const [points, setPoints] = useState<GpxPoint[]>([]);
  const [sogPoints, setSogPoints] = useState<SogPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [speed, setSpeed] = useState<SpeedMultiplier>(1);

  // Derived values
  const timedPoints = points.filter((p) => p.time !== null);
  const startTimeMs = timedPoints.length > 0 ? timedPoints[0].time!.getTime() : 0;
  const endTimeMs =
    timedPoints.length > 0
      ? timedPoints[timedPoints.length - 1].time!.getTime()
      : 0;
  const totalMs = endTimeMs - startTimeMs;

  // Load GPX
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/attempts/${attemptId}/gpx`);
        if (!res.ok) throw new Error("Failed to fetch GPX URL");
        const { url } = await res.json();

        const gpxRes = await fetch(url);
        if (!gpxRes.ok) throw new Error("Failed to download GPX");
        const xml = await gpxRes.text();

        const parsed = parseGpxXml(xml);
        setPoints(parsed.points);
        setSogPoints(computeSog(parsed.points));

        const timed = parsed.points.filter((p) => p.time !== null);
        if (timed.length > 0) {
          setCurrentTimeMs(timed[0].time!.getTime());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load GPX");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [attemptId]);

  // RAF playback loop
  useEffect(() => {
    if (!isPlaying || totalMs === 0) return;

    let lastRealTime: number | null = null;
    let rafId: number;

    function tick(realNow: number) {
      if (lastRealTime === null) {
        lastRealTime = realNow;
        rafId = requestAnimationFrame(tick);
        return;
      }

      const realElapsed = realNow - lastRealTime;
      lastRealTime = realNow;

      setCurrentTimeMs((prev) => {
        const next = prev + realElapsed * speed;
        if (next >= endTimeMs) {
          setIsPlaying(false);
          return endTimeMs;
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, speed, totalMs, endTimeMs]);

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    setCurrentTimeMs(startTimeMs + (parseFloat(e.target.value) / 100) * totalMs);
  }

  function handlePlayPause() {
    if (currentTimeMs >= endTimeMs) {
      setCurrentTimeMs(startTimeMs);
    }
    setIsPlaying((p) => !p);
  }

  const progressPct = totalMs > 0 ? ((currentTimeMs - startTimeMs) / totalMs) * 100 : 0;

  if (loading) {
    return (
      <div className="border rounded-lg h-[500px] flex items-center justify-center text-muted-foreground">
        Loading track...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border rounded-lg p-6 text-red-600">
        Error loading track: {error}
      </div>
    );
  }

  if (timedPoints.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-muted-foreground">
        No timestamped track data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map */}
      <div className="h-[400px] border rounded-lg overflow-hidden">
        <TrackMapDynamic
          points={timedPoints}
          currentTimeMs={currentTimeMs}
        />
      </div>

      {/* SOG Chart */}
      {sogPoints.length > 0 && (
        <div className="border rounded-lg p-4 h-[200px]">
          <SogChart sogPoints={sogPoints} currentTimeMs={currentTimeMs} />
        </div>
      )}

      {/* Controls */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayPause}
            className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {isPlaying ? "⏸ Pause" : currentTimeMs >= endTimeMs ? "↺ Restart" : "▶ Play"}
          </button>

          <div className="flex items-center gap-1">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  speed === s
                    ? "bg-primary text-white"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <span className="text-sm text-muted-foreground ml-auto">
            {new Date(currentTimeMs).toISOString().substr(11, 8)} UTC
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          step={0.01}
          value={progressPct}
          onChange={handleScrub}
          className="w-full accent-primary"
        />
      </div>
    </div>
  );
}
