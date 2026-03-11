export interface GpxPoint {
  lat: number;
  lon: number;
  time: Date | null;
  ele?: number;
}

export interface ParsedGpx {
  points: GpxPoint[];
  startTime: Date | null;
  endTime: Date | null;
  durationSec: number | null;
}

export function parseGpxXml(xmlString: string): ParsedGpx {
  // Simple XML parsing for GPX without external lib (works in Node env)
  const points: GpxPoint[] = [];

  // Match trkpt elements
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  let match;

  while ((match = trkptRegex.exec(xmlString)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    const inner = match[3];

    const timeMatch = /<time>([^<]+)<\/time>/.exec(inner);
    const eleMatch = /<ele>([^<]+)<\/ele>/.exec(inner);

    points.push({
      lat,
      lon,
      time: timeMatch ? new Date(timeMatch[1].trim()) : null,
      ele: eleMatch ? parseFloat(eleMatch[1]) : undefined,
    });
  }

  const timedPoints = points.filter((p) => p.time !== null);
  const startTime = timedPoints.length > 0 ? timedPoints[0].time : null;
  const endTime = timedPoints.length > 0 ? timedPoints[timedPoints.length - 1].time : null;

  let durationSec: number | null = null;
  if (startTime && endTime) {
    durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  }

  return { points, startTime, endTime, durationSec };
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  }
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
