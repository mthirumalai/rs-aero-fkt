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
  /** For line starts: distance to the line */
  nearestStartLineDistanceM?: number;
  /** For line finishes: distance to the line */
  nearestFinishLineDistanceM?: number;
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
 * Calculate the shortest distance from a point to a line segment
 * Returns distance in meters
 */
function distanceToLineSegment(
  lineStart: { lat: number; lon: number },
  lineEnd: { lat: number; lon: number },
  point: { lat: number; lon: number }
): number {
  const A = point.lat - lineStart.lat;
  const B = point.lon - lineStart.lon;
  const C = lineEnd.lat - lineStart.lat;
  const D = lineEnd.lon - lineStart.lon;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) {
    // Line segment is actually a point
    return haversineMeters(point.lat, point.lon, lineStart.lat, lineStart.lon);
  }

  const param = dot / lenSq;

  let closestLat: number;
  let closestLon: number;

  if (param < 0) {
    // Closest point is beyond the start of the segment
    closestLat = lineStart.lat;
    closestLon = lineStart.lon;
  } else if (param > 1) {
    // Closest point is beyond the end of the segment
    closestLat = lineEnd.lat;
    closestLon = lineEnd.lon;
  } else {
    // Closest point is on the segment
    closestLat = lineStart.lat + param * C;
    closestLon = lineStart.lon + param * D;
  }

  return haversineMeters(point.lat, point.lon, closestLat, closestLon);
}

/**
 * Check if two line segments intersect (for line crossing detection)
 * Returns true if the segments intersect
 */
function lineSegmentsIntersect(
  p1: { lat: number; lon: number },
  q1: { lat: number; lon: number },
  p2: { lat: number; lon: number },
  q2: { lat: number; lon: number }
): boolean {
  function onSegment(p: { lat: number; lon: number }, q: { lat: number; lon: number }, r: { lat: number; lon: number }): boolean {
    return q.lat <= Math.max(p.lat, r.lat) && q.lat >= Math.min(p.lat, r.lat) &&
           q.lon <= Math.max(p.lon, r.lon) && q.lon >= Math.min(p.lon, r.lon);
  }

  function orientation(p: { lat: number; lon: number }, q: { lat: number; lon: number }, r: { lat: number; lon: number }): number {
    const val = (q.lon - p.lon) * (r.lat - q.lat) - (q.lat - p.lat) * (r.lon - q.lon);
    if (Math.abs(val) < 1e-10) return 0; // Collinear
    return val > 0 ? 1 : 2; // Clock or Counterclock wise
  }

  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  // General case
  if (o1 !== o2 && o3 !== o4) return true;

  // Special cases for collinear points
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

/**
 * Find all crossings of a track with a line, in chronological order
 * Returns array of { pointIndex, crossingDirection } where direction is 1 or -1
 */
function findLineCrossings(
  points: GpxPoint[],
  lineStart: { lat: number; lon: number },
  lineEnd: { lat: number; lon: number }
): Array<{ pointIndex: number; crossingDirection: number }> {
  const crossings: Array<{ pointIndex: number; crossingDirection: number }> = [];

  for (let i = 0; i < points.length - 1; i++) {
    const trackSegmentStart = { lat: points[i].lat, lon: points[i].lon };
    const trackSegmentEnd = { lat: points[i + 1].lat, lon: points[i + 1].lon };

    if (lineSegmentsIntersect(lineStart, lineEnd, trackSegmentStart, trackSegmentEnd)) {
      // Calculate crossing direction using cross product
      const trackVector = {
        lat: trackSegmentEnd.lat - trackSegmentStart.lat,
        lon: trackSegmentEnd.lon - trackSegmentStart.lon
      };

      const lineVector = {
        lat: lineEnd.lat - lineStart.lat,
        lon: lineEnd.lon - lineStart.lon
      };

      // Cross product to determine which way we're crossing the line
      const crossDirection = trackVector.lat * lineVector.lon - trackVector.lon * lineVector.lat;

      crossings.push({
        pointIndex: i + 1, // Use the second point of the crossing segment
        crossingDirection: crossDirection > 0 ? 1 : -1
      });
    }
  }

  return crossings;
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

/**
 * Enhanced validation function that supports both points and lines
 */
export function validateGpxTrackEnhanced(
  gpx: ParsedGpx,
  startType: 'POINT' | 'LINE',
  startLat: number,
  startLng: number,
  finishType: 'POINT' | 'LINE',
  finishLat: number,
  finishLng: number,
  startLine2Lat?: number,
  startLine2Lng?: number,
  finishLine2Lat?: number,
  finishLine2Lng?: number,
  toleranceM = 10
): ValidationResult {
  const { points } = gpx;

  if (points.length < 2) {
    return { valid: false, error: "GPX track has fewer than 2 points" };
  }

  const timedPoints = points.filter((p) => p.time !== null);
  if (timedPoints.length < 2) {
    return { valid: false, error: "GPX track must contain timestamps (<time> elements)" };
  }

  // Handle start validation
  let matchedStartIdx = -1;
  let nearestStartDist = Infinity;
  let nearestStartLineDist: number | undefined;

  if (startType === 'POINT') {
    // Point-based start validation (existing logic)
    for (let i = 0; i < points.length; i++) {
      const dist = haversineMeters(points[i].lat, points[i].lon, startLat, startLng);
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
  } else if (startType === 'LINE') {
    // Line-based start validation
    if (startLine2Lat === undefined || startLine2Lng === undefined) {
      return { valid: false, error: "Start line coordinates are required for LINE start type" };
    }

    const lineStart = { lat: startLat, lon: startLng };
    const lineEnd = { lat: startLine2Lat, lon: startLine2Lng };

    // Find nearest approach to the line
    for (let i = 0; i < points.length; i++) {
      const distToLine = distanceToLineSegment(lineStart, lineEnd, { lat: points[i].lat, lon: points[i].lon });
      if (distToLine < nearestStartDist) nearestStartDist = distToLine;
    }
    nearestStartLineDist = Math.round(nearestStartDist);

    // Find all line crossings - we'll handle direction detection here
    const crossings = findLineCrossings(points, lineStart, lineEnd);

    if (crossings.length === 0) {
      return {
        valid: false,
        nearestStartLineDistanceM: nearestStartLineDist,
        error: `Track does not cross start line. Verify your track crosses the start line correctly. Nearest approach to start line: ${nearestStartLineDist}m.`,
      };
    }

    // For start lines, we want the last crossing (handles false starts)
    // Direction doesn't matter as much - any crossing should count as a valid start
    matchedStartIdx = crossings[crossings.length - 1].pointIndex;
  }

  // Handle finish validation
  let matchedFinishIdx = -1;
  let nearestFinishDist = Infinity;
  let nearestFinishLineDist: number | undefined;

  if (finishType === 'POINT') {
    // Point-based finish validation (existing logic)
    for (let i = matchedStartIdx + 1; i < points.length; i++) {
      const dist = haversineMeters(points[i].lat, points[i].lon, finishLat, finishLng);
      if (dist < nearestFinishDist) nearestFinishDist = dist;
      if (dist <= toleranceM && matchedFinishIdx === -1) {
        matchedFinishIdx = i;
      }
    }

    if (matchedFinishIdx === -1) {
      return {
        valid: false,
        nearestFinishDistanceM: Math.round(nearestFinishDist),
        error: `Track does not pass within ${toleranceM}m of route finish point after start. Verify your track covers the route finish location. Nearest approach to finish: ${Math.round(nearestFinishDist)}m.`,
      };
    }
  } else if (finishType === 'LINE') {
    // Line-based finish validation
    if (finishLine2Lat === undefined || finishLine2Lng === undefined) {
      return { valid: false, error: "Finish line coordinates are required for LINE finish type" };
    }

    const lineStart = { lat: finishLat, lon: finishLng };
    const lineEnd = { lat: finishLine2Lat, lon: finishLine2Lng };

    // Find nearest approach to the line after start
    for (let i = matchedStartIdx + 1; i < points.length; i++) {
      const distToLine = distanceToLineSegment(lineStart, lineEnd, { lat: points[i].lat, lon: points[i].lon });
      if (distToLine < nearestFinishDist) nearestFinishDist = distToLine;
    }
    nearestFinishLineDist = Math.round(nearestFinishDist);

    // Find line crossings after the start point
    const postStartPoints = points.slice(matchedStartIdx + 1);
    const crossings = findLineCrossings(postStartPoints, lineStart, lineEnd);

    if (crossings.length === 0) {
      return {
        valid: false,
        nearestFinishLineDistanceM: nearestFinishLineDist,
        error: `Track does not cross finish line after starting. Verify your track crosses the finish line correctly. Nearest approach to finish line: ${nearestFinishLineDist}m.`,
      };
    }

    // For finish lines, use the first crossing after start
    // This handles the most common case correctly
    matchedFinishIdx = matchedStartIdx + 1 + crossings[0].pointIndex;
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
    nearestStartDistanceM: startType === 'POINT' ? Math.round(nearestStartDist) : undefined,
    nearestFinishDistanceM: finishType === 'POINT' ? Math.round(nearestFinishDist) : undefined,
    nearestStartLineDistanceM: nearestStartLineDist,
    nearestFinishLineDistanceM: nearestFinishLineDist,
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
