import { GpxPoint, ParsedGpx } from "./parser";

export interface ValidationResult {
  valid: boolean;
  durationSec?: number;
  startPoint?: GpxPoint;
  endPoint?: GpxPoint;
  /** Only the track points between (inclusive) the matched start and end entries */
  racePoints?: GpxPoint[];
  nearestStartDistanceM?: number;
  nearestEndDistanceM?: number;
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
  routeEndLat: number,
  routeEndLng: number,
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

  // Find first point AFTER start that's within tolerance of end
  let matchedEndIdx = -1;
  let nearestEndDist = Infinity;
  let nearestEndDistBeforeStart = Infinity;
  let endMatchIdxBeforeStart = -1;

  // Check if there's an end point match BEFORE the start (sequence issue)
  for (let i = 0; i < matchedStartIdx; i++) {
    const dist = haversineMeters(points[i].lat, points[i].lon, routeEndLat, routeEndLng);
    if (dist < nearestEndDistBeforeStart) {
      nearestEndDistBeforeStart = dist;
      if (dist <= toleranceM) {
        endMatchIdxBeforeStart = i;
      }
    }
  }

  for (let i = matchedStartIdx + 1; i < points.length; i++) {
    const dist = haversineMeters(points[i].lat, points[i].lon, routeEndLat, routeEndLng);
    if (dist < nearestEndDist) nearestEndDist = dist;
    if (dist <= toleranceM && matchedEndIdx === -1) {
      matchedEndIdx = i;
    }
  }

  if (matchedEndIdx === -1) {
    let errorMsg;
    if (endMatchIdxBeforeStart !== -1) {
      const startPoint = points[matchedStartIdx];
      const endPoint = points[endMatchIdxBeforeStart];
      errorMsg = `Found a point in the FKT gpx track that matches start point in the route, Point ${matchedStartIdx + 1} (${startPoint.lat.toFixed(6)}, ${startPoint.lon.toFixed(6)}). Found a point in the FKT gpx track that matches end point, point ${endMatchIdxBeforeStart + 1} (${endPoint.lat.toFixed(6)}, ${endPoint.lon.toFixed(6)}). The FKT attempt runs in the opposite direction from this route definition. Please select or load a different route.`;
    } else {
      const startPoint = points[matchedStartIdx];
      errorMsg = `Found a point in the FKT gpx track that matches start point in the route, Point ${matchedStartIdx + 1} (${startPoint.lat.toFixed(6)}, ${startPoint.lon.toFixed(6)}). Could not find route end point within ${toleranceM}m chronologically after the start point. Nearest end point after start: ${Math.round(nearestEndDist)}m.`;
    }
    return {
      valid: false,
      nearestEndDistanceM: Math.round(nearestEndDist),
      error: errorMsg,
    };
  }

  const startPoint = points[matchedStartIdx];
  const endPoint = points[matchedEndIdx];

  if (!startPoint.time || !endPoint.time) {
    return { valid: false, error: "Matched track points are missing timestamps" };
  }

  const durationSec = Math.round(
    (endPoint.time.getTime() - startPoint.time.getTime()) / 1000
  );

  if (durationSec <= 0) {
    return { valid: false, error: "Calculated duration is zero or negative" };
  }

  return {
    valid: true,
    durationSec,
    startPoint,
    endPoint,
    racePoints: points.slice(matchedStartIdx, matchedEndIdx + 1),
    nearestStartDistanceM: Math.round(nearestStartDist),
    nearestEndDistanceM: Math.round(nearestEndDist),
  };
}

export { haversineMeters };

/** Great-circle distance in nautical miles between two lat/lng points */
export function distanceNm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const metres = haversineMeters(lat1, lon1, lat2, lon2);
  return Math.round((metres / 1852) * 10) / 10; // 1 nm = 1852 m, 1 dp
}
