import { GpxPoint } from "./parser";
import { haversineMeters } from "./validator";

export interface SogPoint {
  timeMs: number;
  sogKnots: number;
  lat: number;
  lon: number;
}

export function computeSog(points: GpxPoint[], smoothingWindow = 5): SogPoint[] {
  const timedPoints = points.filter((p) => p.time !== null);
  if (timedPoints.length < 2) return [];

  const rawSog: SogPoint[] = [];

  for (let i = 1; i < timedPoints.length; i++) {
    const prev = timedPoints[i - 1];
    const curr = timedPoints[i];
    const distM = haversineMeters(prev.lat, prev.lon, curr.lat, curr.lon);
    const timeDiffSec = (curr.time!.getTime() - prev.time!.getTime()) / 1000;

    if (timeDiffSec <= 0) continue;

    const speedMs = distM / timeDiffSec;
    const sogKnots = speedMs * 1.94384;

    rawSog.push({
      timeMs: curr.time!.getTime(),
      sogKnots,
      lat: curr.lat,
      lon: curr.lon,
    });
  }

  // Apply rolling average smoothing
  const smoothed: SogPoint[] = rawSog.map((point, i) => {
    const half = Math.floor(smoothingWindow / 2);
    const start = Math.max(0, i - half);
    const end = Math.min(rawSog.length - 1, i + half);
    const window = rawSog.slice(start, end + 1);
    const avgSog = window.reduce((sum, p) => sum + p.sogKnots, 0) / window.length;
    return { ...point, sogKnots: Math.round(avgSog * 100) / 100 };
  });

  return smoothed;
}

export function computeAvgMaxSog(sogPoints: SogPoint[]): {
  avgSogKnots: number;
  maxSogKnots: number;
} {
  if (sogPoints.length === 0) return { avgSogKnots: 0, maxSogKnots: 0 };
  const avg =
    sogPoints.reduce((sum, p) => sum + p.sogKnots, 0) / sogPoints.length;
  const max = Math.max(...sogPoints.map((p) => p.sogKnots));
  return {
    avgSogKnots: Math.round(avg * 10) / 10,
    maxSogKnots: Math.round(max * 10) / 10,
  };
}
