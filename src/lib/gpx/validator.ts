import { GpxPoint, ParsedGpx } from "./parser";

export interface ValidationResult {
  valid: boolean;
  durationSec?: number;
  startPoint?: GpxPoint;
  endPoint?: GpxPoint;
  nearestStartDistanceM?: number;
  nearestEndDistanceM?: number;
  error?: string;
}

function haversineMeters(
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
      error: `Track does not pass within ${toleranceM}m of route start (nearest: ${Math.round(nearestStartDist)}m)`,
    };
  }

  // Find first point AFTER start that's within tolerance of end
  let matchedEndIdx = -1;
  let nearestEndDist = Infinity;

  for (let i = matchedStartIdx + 1; i < points.length; i++) {
    const dist = haversineMeters(points[i].lat, points[i].lon, routeEndLat, routeEndLng);
    if (dist < nearestEndDist) nearestEndDist = dist;
    if (dist <= toleranceM && matchedEndIdx === -1) {
      matchedEndIdx = i;
    }
  }

  if (matchedEndIdx === -1) {
    return {
      valid: false,
      nearestEndDistanceM: Math.round(nearestEndDist),
      error: `Track does not pass within ${toleranceM}m of route end (nearest: ${Math.round(nearestEndDist)}m)`,
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
    nearestStartDistanceM: Math.round(nearestStartDist),
    nearestEndDistanceM: Math.round(nearestEndDist),
  };
}

export { haversineMeters };
