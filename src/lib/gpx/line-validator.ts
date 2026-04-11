import { GpxPoint, ParsedGpx } from "./parser";

export interface LineValidationResult {
  valid: boolean;
  durationSec?: number;
  startPoint?: GpxPoint;
  finishPoint?: GpxPoint;
  /** Track points between last start line crossing and first finish line crossing */
  racePoints?: GpxPoint[];
  error?: string;
  /** Timing details for debugging */
  timingDetails?: {
    startLineCrossings: number;
    finishLineCrossings: number;
    lastStartCrossingIndex?: number;
    firstFinishCrossingIndex?: number;
  };
}

interface LineCrossing {
  pointIndex: number;
  point: GpxPoint;
  crossingTime: Date;
}

/**
 * Check if a line segment (p1->p2) intersects with a line defined by two points (lineStart->lineEnd)
 * Uses the line segment intersection algorithm
 */
function doLinesIntersect(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number },
  lineStart: { lat: number; lng: number },
  lineEnd: { lat: number; lng: number }
): boolean {
  const x1 = p1.lng, y1 = p1.lat;
  const x2 = p2.lng, y2 = p2.lat;
  const x3 = lineStart.lng, y3 = lineStart.lat;
  const x4 = lineEnd.lng, y4 = lineEnd.lat;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) {
    // Lines are parallel or collinear
    return false;
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  // Check if the intersection point lies within both line segments
  return (t >= 0 && t <= 1) && (u >= 0 && u <= 1);
}

/**
 * Find all line crossings for a given line
 */
function findLineCrossings(
  points: GpxPoint[],
  lineStart: { lat: number; lng: number },
  lineEnd: { lat: number; lng: number }
): LineCrossing[] {
  const crossings: LineCrossing[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = { lat: points[i].lat, lng: points[i].lon };
    const p2 = { lat: points[i + 1].lat, lng: points[i + 1].lon };

    if (doLinesIntersect(p1, p2, lineStart, lineEnd)) {
      // Use the second point's time (when the crossing completed)
      const crossing = {
        pointIndex: i + 1,
        point: points[i + 1],
        crossingTime: points[i + 1].time || new Date()
      };

      console.log("🚩 LINE CROSSING DETECTED:", {
        segmentIndex: i,
        pointIndex: i + 1,
        from: { lat: p1.lat.toFixed(6), lng: p1.lng.toFixed(6) },
        to: { lat: p2.lat.toFixed(6), lng: p2.lng.toFixed(6) },
        crossingPoint: {
          lat: points[i + 1].lat.toFixed(6),
          lng: points[i + 1].lon.toFixed(6)
        },
        crossingTime: points[i + 1].time?.toISOString(),
        lineStart: { lat: lineStart.lat.toFixed(6), lng: lineStart.lng.toFixed(6) },
        lineEnd: { lat: lineEnd.lat.toFixed(6), lng: lineEnd.lng.toFixed(6) }
      });

      crossings.push(crossing);
    }
  }

  return crossings;
}

/**
 * Enhanced GPX validator for line-to-line courses
 */
export function validateGpxTrackForLines(
  gpx: ParsedGpx,
  startLineStart: { lat: number; lng: number },
  startLineEnd: { lat: number; lng: number },
  finishLineStart: { lat: number; lng: number },
  finishLineEnd: { lat: number; lng: number }
): LineValidationResult {
  const { points } = gpx;

  if (points.length < 2) {
    return { valid: false, error: "GPX track has fewer than 2 points" };
  }

  const timedPoints = points.filter((p) => p.time !== null);
  if (timedPoints.length < 2) {
    return { valid: false, error: "GPX track must contain timestamps (<time> elements)" };
  }

  // Find all line crossings
  const startLineCrossings = findLineCrossings(timedPoints, startLineStart, startLineEnd);
  const finishLineCrossings = findLineCrossings(timedPoints, finishLineStart, finishLineEnd);

  // Check if track crosses start line
  if (startLineCrossings.length === 0) {
    return {
      valid: false,
      error: "Track does not cross the start line",
    };
  }

  // Check if track crosses finish line
  if (finishLineCrossings.length === 0) {
    return {
      valid: false,
      error: "Track does not cross the finish line",
    };
  }

  // Find the last start line crossing and first finish line crossing
  const lastStartCrossing = startLineCrossings[startLineCrossings.length - 1];
  const firstFinishCrossing = finishLineCrossings[0];

  console.log("🏁 START LINE DETECTED:", {
    crossingIndex: lastStartCrossing.pointIndex,
    trackPoint: {
      lat: lastStartCrossing.point.lat.toFixed(6),
      lng: lastStartCrossing.point.lon.toFixed(6),
      time: lastStartCrossing.crossingTime.toISOString()
    },
    totalStartCrossings: startLineCrossings.length
  });

  console.log("🏁 FINISH LINE DETECTED:", {
    crossingIndex: firstFinishCrossing.pointIndex,
    trackPoint: {
      lat: firstFinishCrossing.point.lat.toFixed(6),
      lng: firstFinishCrossing.point.lon.toFixed(6),
      time: firstFinishCrossing.crossingTime.toISOString()
    },
    totalFinishCrossings: finishLineCrossings.length
  });

  // Ensure finish crossing happens after start crossing
  if (firstFinishCrossing.crossingTime <= lastStartCrossing.crossingTime) {
    return {
      valid: false,
      error: "Finish line crossing must occur after the last start line crossing",
    };
  }

  // Extract race points (between last start crossing and first finish crossing)
  const racePoints = timedPoints.slice(lastStartCrossing.pointIndex, firstFinishCrossing.pointIndex + 1);

  // Calculate duration
  const durationMs = firstFinishCrossing.crossingTime.getTime() - lastStartCrossing.crossingTime.getTime();
  const durationSec = Math.round(durationMs / 1000);

  return {
    valid: true,
    durationSec,
    startPoint: lastStartCrossing.point,
    finishPoint: firstFinishCrossing.point,
    racePoints,
    timingDetails: {
      startLineCrossings: startLineCrossings.length,
      finishLineCrossings: finishLineCrossings.length,
      lastStartCrossingIndex: lastStartCrossing.pointIndex,
      firstFinishCrossingIndex: firstFinishCrossing.pointIndex,
    },
  };
}

/**
 * Convenience function for point-to-line validation (when only one coordinate is a line)
 */
export function validateGpxTrackMixed(
  gpx: ParsedGpx,
  startConfig: {
    type: "POINT" | "LINE";
    lat: number;
    lng: number;
    lat2?: number;
    lng2?: number;
  },
  finishConfig: {
    type: "POINT" | "LINE";
    lat: number;
    lng: number;
    lat2?: number;
    lng2?: number;
  }
): LineValidationResult {
  // If both are lines, use full line validation
  if (startConfig.type === "LINE" && finishConfig.type === "LINE") {
    if (!startConfig.lat2 || !startConfig.lng2 || !finishConfig.lat2 || !finishConfig.lng2) {
      return { valid: false, error: "Line coordinates are incomplete" };
    }

    return validateGpxTrackForLines(
      gpx,
      { lat: startConfig.lat, lng: startConfig.lng },
      { lat: startConfig.lat2, lng: startConfig.lng2 },
      { lat: finishConfig.lat, lng: finishConfig.lng },
      { lat: finishConfig.lat2, lng: finishConfig.lng2 }
    );
  }

  // For mixed point/line or point/point, fall back to existing circle-based validation
  // This would integrate with the existing enhanced-validator.ts logic
  return {
    valid: false,
    error: "Mixed point/line validation not yet implemented - use existing circle-based validation"
  };
}