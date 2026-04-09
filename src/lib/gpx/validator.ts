import { GpxPoint, ParsedGpx } from "./parser";
import { VALIDATION_TOLERANCE_METERS } from "./constants";

export interface ValidationResult {
  valid: boolean;
  durationSec?: number;
  startPoint?: GpxPoint;
  finishPoint?: GpxPoint;
  turningPoint?: GpxPoint;
  /** Only the track points between (inclusive) the matched start and finish entries */
  racePoints?: GpxPoint[];
  nearestStartDistanceM?: number;
  nearestFinishDistanceM?: number;
  nearestTurningMarkDistanceM?: number;
  error?: string;
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function validateGpxTrack(
  gpx: ParsedGpx,
  routeStartLat: number,
  routeStartLng: number,
  routeFinishLat: number,
  routeFinishLng: number,
  toleranceM = VALIDATION_TOLERANCE_METERS
): ValidationResult {
  const { points } = gpx;

  if (points.length < 2) {
    return { valid: false, error: "GPX track has fewer than 2 points" };
  }

  const timedPoints = points.filter((p) => p.time !== null);
  if (timedPoints.length < 2) {
    return { valid: false, error: "GPX track must contain timestamps (<time> elements)" };
  }

  // Find first point within tolerance of start
  let matchedStartIdx = -1;
  let nearestStartDist = Infinity;

  for (let i = 0; i < points.length; i++) {
    const dist = haversineMeters(points[i].lat, points[i].lon, routeStartLat, routeStartLng);
    if (dist < nearestStartDist) nearestStartDist = dist;
    if (dist <= toleranceM && matchedStartIdx === -1) {
      matchedStartIdx = i;
    }
  }

  if (matchedStartIdx === -1) {
    return {
      valid: false,
      nearestStartDistanceM: Math.round(nearestStartDist),
      error: `Track does not pass within ${toleranceM}m of route start point. Verify your track covers the route start location. Nearest approach to start: ${Math.round(nearestStartDist)}m.`,
    };
  }

  // Find first point AFTER start that's within tolerance of finish
  let matchedFinishIdx = -1;
  let nearestFinishDist = Infinity;
  let nearestFinishDistBeforeStart = Infinity;
  let finishMatchIdxBeforeStart = -1;

  // Check if there's a finish point match BEFORE the start (sequence issue)
  for (let i = 0; i < matchedStartIdx; i++) {
    const dist = haversineMeters(points[i].lat, points[i].lon, routeFinishLat, routeFinishLng);
    if (dist < nearestFinishDistBeforeStart) {
      nearestFinishDistBeforeStart = dist;
      if (dist <= toleranceM) {
        finishMatchIdxBeforeStart = i;
      }
    }
  }

  for (let i = matchedStartIdx + 1; i < points.length; i++) {
    const dist = haversineMeters(points[i].lat, points[i].lon, routeFinishLat, routeFinishLng);
    if (dist < nearestFinishDist) nearestFinishDist = dist;
    if (dist <= toleranceM && matchedFinishIdx === -1) {
      matchedFinishIdx = i;
    }
  }

  if (matchedFinishIdx === -1) {
    let errorMsg;
    if (finishMatchIdxBeforeStart !== -1) {
      const startPoint = points[matchedStartIdx];
      const finishPoint = points[finishMatchIdxBeforeStart];
      errorMsg = `Found a point in the FKT gpx track that matches start point in the route, Point ${matchedStartIdx + 1} (${startPoint.lat.toFixed(6)}, ${startPoint.lon.toFixed(6)}). Found a point in the FKT gpx track that matches finish point, point ${finishMatchIdxBeforeStart + 1} (${finishPoint.lat.toFixed(6)}, ${finishPoint.lon.toFixed(6)}). The FKT attempt runs in the opposite direction from this route definition. Please select or load a different route.`;
    } else {
      const startPoint = points[matchedStartIdx];
      errorMsg = `Found a point in the FKT gpx track that matches start point in the route, Point ${matchedStartIdx + 1} (${startPoint.lat.toFixed(6)}, ${startPoint.lon.toFixed(6)}). Could not find route finish point within ${toleranceM}m chronologically after the start point. Nearest finish point after start: ${Math.round(nearestFinishDist)}m.`;
    }
    return {
      valid: false,
      nearestFinishDistanceM: Math.round(nearestFinishDist),
      error: errorMsg,
    };
  }

  const startPoint = points[matchedStartIdx];
  const finishPoint = points[matchedFinishIdx];

  if (!startPoint.time || !finishPoint.time) {
    return { valid: false, error: "Matched track points are missing timestamps" };
  }

  const durationSec = Math.round(
    (finishPoint.time.getTime() - startPoint.time.getTime()) / 1000
  );

  if (durationSec <= 0) {
    return { valid: false, error: "Calculated duration is zero or negative" };
  }

  return {
    valid: true,
    durationSec,
    startPoint,
    finishPoint,
    racePoints: points.slice(matchedStartIdx, matchedFinishIdx + 1),
    nearestStartDistanceM: Math.round(nearestStartDist),
    nearestFinishDistanceM: Math.round(nearestFinishDist),
  };
}

/**
 * Calculate the cross product to determine which side of a line segment a point is on
 * Returns positive if point is on the left side, negative if on the right side
 */
function crossProduct(
  lineStart: { lat: number; lon: number },
  lineEnd: { lat: number; lon: number },
  point: { lat: number; lon: number }
): number {
  return (lineEnd.lon - lineStart.lon) * (point.lat - lineStart.lat) -
         (lineEnd.lat - lineStart.lat) * (point.lon - lineStart.lon);
}

/**
 * Determine which side of the turning mark the boat is approaching from
 * relative to the line from start/finish to turning mark
 */
function determineSide(
  startFinish: { lat: number; lon: number },
  turningMark: { lat: number; lon: number },
  trackPoint: { lat: number; lon: number }
): 'port' | 'starboard' {
  const cross = crossProduct(startFinish, turningMark, trackPoint);
  return cross > 0 ? 'port' : 'starboard';
}

export function validateOutAndBackGpxTrack(
  gpx: ParsedGpx,
  routeStartLat: number,
  routeStartLng: number,
  turningMarkLat: number,
  turningMarkLng: number,
  toleranceM = VALIDATION_TOLERANCE_METERS
): ValidationResult {
  const { points } = gpx;

  if (points.length < 3) {
    return { valid: false, error: "GPX track has fewer than 3 points" };
  }

  const timedPoints = points.filter((p) => p.time !== null);
  if (timedPoints.length < 3) {
    return { valid: false, error: "GPX track must contain timestamps (<time> elements)" };
  }

  // Find all crossings of start/finish circle
  const startFinishCrossings: number[] = [];
  let nearestStartDist = Infinity;

  for (let i = 0; i < points.length; i++) {
    const dist = haversineMeters(points[i].lat, points[i].lon, routeStartLat, routeStartLng);
    if (dist < nearestStartDist) nearestStartDist = dist;
    if (dist <= toleranceM) {
      startFinishCrossings.push(i);
    }
  }

  if (startFinishCrossings.length < 2) {
    return {
      valid: false,
      nearestStartDistanceM: Math.round(nearestStartDist),
      error: `Track must cross start/finish point at least twice for out-and-back routes. Found ${startFinishCrossings.length} crossing(s). Nearest approach: ${Math.round(nearestStartDist)}m.`,
    };
  }

  // Find turning mark approach
  let turningMarkIdx = -1;
  let nearestTurningDist = Infinity;

  for (let i = 0; i < points.length; i++) {
    const dist = haversineMeters(points[i].lat, points[i].lon, turningMarkLat, turningMarkLng);
    if (dist < nearestTurningDist) nearestTurningDist = dist;
    if (dist <= toleranceM && turningMarkIdx === -1) {
      turningMarkIdx = i;
    }
  }

  if (turningMarkIdx === -1) {
    return {
      valid: false,
      nearestTurningMarkDistanceM: Math.round(nearestTurningDist),
      error: `Track does not pass within ${toleranceM}m of turning mark. Nearest approach: ${Math.round(nearestTurningDist)}m.`,
    };
  }

  // Find the start crossing before turning mark
  const startCrossingBeforeTurn = startFinishCrossings.filter(idx => idx < turningMarkIdx);
  if (startCrossingBeforeTurn.length === 0) {
    return {
      valid: false,
      error: "Track must cross start/finish point before reaching the turning mark.",
    };
  }

  // Find the finish crossing after turning mark
  const finishCrossingAfterTurn = startFinishCrossings.filter(idx => idx > turningMarkIdx);
  if (finishCrossingAfterTurn.length === 0) {
    return {
      valid: false,
      error: "Track must return to start/finish point after rounding the turning mark.",
    };
  }

  // Use the last start crossing before turning mark as start
  const startIdx = startCrossingBeforeTurn[startCrossingBeforeTurn.length - 1];

  // Use the first finish crossing after turning mark as finish
  const finishIdx = finishCrossingAfterTurn[0];

  // Validate turning mark rounding - check approach and exit sides
  const startFinishPoint = { lat: routeStartLat, lon: routeStartLng };
  const turningMarkPoint = { lat: turningMarkLat, lon: turningMarkLng };

  // Find points approaching and leaving the turning mark - use smaller range for precision
  const approachRange = 5; // Look at closer points for more accurate side determination
  const approachStart = Math.max(0, turningMarkIdx - approachRange);
  const exitEnd = Math.min(points.length - 1, turningMarkIdx + approachRange);

  // Determine approach side (focus on points just before turning mark)
  const approachSideCount = { port: 0, starboard: 0 };
  for (let i = Math.max(approachStart, turningMarkIdx - 3); i < turningMarkIdx; i++) {
    const side = determineSide(startFinishPoint, turningMarkPoint, points[i]);
    approachSideCount[side]++;
  }

  // Determine exit side (focus on points just after turning mark)
  const exitSideCount = { port: 0, starboard: 0 };
  for (let i = turningMarkIdx + 1; i <= Math.min(exitEnd, turningMarkIdx + 3); i++) {
    const side = determineSide(startFinishPoint, turningMarkPoint, points[i]);
    exitSideCount[side]++;
  }

  const approachSide = approachSideCount.port > approachSideCount.starboard ? 'port' : 'starboard';
  const exitSide = exitSideCount.port > exitSideCount.starboard ? 'port' : 'starboard';

  // Validate that the boat rounded the mark (exited on opposite side from approach)
  if (approachSide === exitSide) {
    return {
      valid: false,
      error: `Invalid turning mark rounding: approached from ${approachSide} side but also exited on ${exitSide} side. The track must round the turning mark, not just approach and return.`,
    };
  }

  const startPoint = points[startIdx];
  const finishPoint = points[finishIdx];
  const turningPoint = points[turningMarkIdx];

  if (!startPoint.time || !finishPoint.time) {
    return { valid: false, error: "Matched track points are missing timestamps" };
  }

  const durationSec = Math.round(
    (finishPoint.time.getTime() - startPoint.time.getTime()) / 1000
  );

  if (durationSec <= 0) {
    return { valid: false, error: "Calculated duration is zero or negative" };
  }

  return {
    valid: true,
    durationSec,
    startPoint,
    finishPoint,
    turningPoint,
    racePoints: points.slice(startIdx, finishIdx + 1),
    nearestStartDistanceM: Math.round(nearestStartDist),
    nearestTurningMarkDistanceM: Math.round(nearestTurningDist),
  };
}

/** Great-circle distance in nautical miles between two lat/lng points */
export function distanceNm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const metres = haversineMeters(lat1, lon1, lat2, lon2);
  return Math.round((metres / 1852) * 10) / 10; // 1 nm = 1852 m, 1 dp
}
