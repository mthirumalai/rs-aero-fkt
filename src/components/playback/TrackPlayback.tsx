"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { parseGpxXml, type GpxPoint } from "@/lib/gpx/parser";
import { parseVccXml } from "@/lib/velocitek/vcc-parser";
import { parseVelocitkCsv } from "@/lib/velocitek/parser";
import { computeSog, type SogPoint } from "@/lib/gpx/sog";
import { Button } from "@/components/ui/button";

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

const SPEED_OPTIONS = [1, 10, 100, 1000] as const;
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

  // Load track file
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/attempts/${attemptId}/gpx`);
        if (!res.ok) throw new Error("Failed to fetch track file");

        // Get the content directly (not JSON)
        const content = await res.text();

        // Determine file type from content-type header or content
        const contentType = res.headers.get('content-type') || '';
        let parsed: { points: GpxPoint[] };

        if (contentType.includes('xml') || content.trim().startsWith('<?xml')) {
          if (content.includes('VelocitekControlCenter')) {
            // VCC file
            parsed = parseVccXml(content);
          } else {
            // GPX file
            parsed = parseGpxXml(content);
          }
        } else if (contentType.includes('csv') || content.includes(',')) {
          // CSV file
          parsed = parseVelocitkCsv(content);
        } else {
          // Default to GPX parsing
          parsed = parseGpxXml(content);
        }

        setPoints(parsed.points);
        setSogPoints(computeSog(parsed.points));

        const timed = parsed.points.filter((p) => p.time !== null);
        if (timed.length > 0) {
          setCurrentTimeMs(timed[0].time!.getTime());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load track");
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
          // Auto-loop: jump back to start and continue playing
          return startTimeMs;
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, speed, totalMs, endTimeMs, startTimeMs]);

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


  // Find current distance by interpolating between SOG points

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
        <div className="border rounded-lg">
          <div className="w-full h-[200px] p-4">
            <SogChart sogPoints={sogPoints} currentTimeMs={currentTimeMs} />
          </div>
        </div>
      )}

      {/* Timeline Controls */}
      <div className="border rounded-lg p-4 space-y-3">
        {/* Scrub Bar */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.01}
          value={progressPct}
          onChange={handleScrub}
          className="w-full accent-primary"
          style={{
            width: 'calc(100% - 125px)', // Match chart: 75px left + 50px right = 125px total
            marginLeft: '75px', // Match chart left margin
            marginRight: '50px' // Match chart right margin
          }}
        />

        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePlayPause}
            className="text-sm font-medium"
          >
            {isPlaying ? "⏸ Pause" : currentTimeMs >= endTimeMs ? "↺ Restart" : "▶ Play"}
          </Button>

          <div className="flex items-center gap-1">
            {SPEED_OPTIONS.map((s) => (
              <Button
                key={s}
                onClick={() => setSpeed(s)}
                variant={speed === s ? "default" : "secondary"}
                size="sm"
                className="text-sm font-medium"
              >
                {s}x
              </Button>
            ))}
          </div>

          <div className="text-sm text-muted-foreground ml-auto text-right">
            <div>Elapsed: {(() => {
              const totalSec = Math.floor((currentTimeMs - startTimeMs) / 1000);
              const h = Math.floor(totalSec / 3600);
              const m = Math.floor((totalSec % 3600) / 60);
              const s = totalSec % 60;
              return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
            })()}</div>
            <div>Local: {new Date(currentTimeMs).toLocaleTimeString('en-US', { hour12: false })}</div>
            <div>UTC: {new Date(currentTimeMs).toISOString().substr(11, 8)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
