import { GpxPoint, ParsedGpx } from "./parser";
import { haversineMeters } from "./validator";

export interface EnhancedValidationResult {
  valid: boolean;
  durationSec?: number;
  startPoint?: GpxPoint;
  endPoint?: GpxPoint;
  /** Track points between when leaving start circle and entering end circle */
  racePoints?: GpxPoint[];
  nearestStartDistanceM?: number;
  nearestEndDistanceM?: number;
  error?: string;
  /** Timing details for debugging */
  timingDetails?: {
    startCircleEntries: number;
    startCircleExits: number;
    endCircleEntries: number;
    endCircleExits: number;
    falseStartDetected: boolean;
    reFinishDetected: boolean;
  };
}

interface CircleEvent {
  pointIndex: number;
  point: GpxPoint;
  eventType: 'enter' | 'exit';
  distance: number;
}

/**
 * Enhanced GPX validator that properly handles:
 * - Timing from leaving start circle to entering end circle
 * - False starts (multiple start circle entries/exits)
 * - Re-finishes (multiple end circle entries/exits)
 */
export function validateGpxTrackEnhanced(
  gpx: ParsedGpx,
  routeStartLat: number,
  routeStartLng: number,
  routeEndLat: number,
  routeEndLng: number,
  toleranceM = 10
): EnhancedValidationResult {
  const { points } = gpx;

  if (points.length < 2) {
    return { valid: false, error: "GPX track has fewer than 2 points" };
  }

  const timedPoints = points.filter((p) => p.time !== null);
  if (timedPoints.length < 2) {
    return { valid: false, error: "GPX track must contain timestamps (<time> elements)" };
  }

  // Analyze circle entry/exit events
  const startEvents = analyzeCircleEvents(points, routeStartLat, routeStartLng, toleranceM);
  const endEvents = analyzeCircleEvents(points, routeEndLat, routeEndLng, toleranceM);

  // Find nearest distances for error reporting
  const nearestStartDist = Math.min(...points.map(p =>
    haversineMeters(p.lat, p.lon, routeStartLat, routeStartLng)
  ));
  const nearestEndDist = Math.min(...points.map(p =>
    haversineMeters(p.lat, p.lon, routeEndLat, routeEndLng)
  ));

  // Check if track enters start circle
  const startEntries = startEvents.filter(e => e.eventType === 'enter');
  if (startEntries.length === 0) {
    return {
      valid: false,
      nearestStartDistanceM: Math.round(nearestStartDist),
      error: `Track does not pass within ${toleranceM}m of route start (nearest: ${Math.round(nearestStartDist)}m)`,
    };
  }

  // Check if track enters end circle
  const endEntries = endEvents.filter(e => e.eventType === 'enter');
  if (endEntries.length === 0) {
    return {
      valid: false,
      nearestEndDistanceM: Math.round(nearestEndDist),
      error: `Track does not pass within ${toleranceM}m of route end (nearest: ${Math.round(nearestEndDist)}m)`,
    };
  }

  // Determine timing points based on requirements
  const timingResult = calculateRaceTiming(startEvents, endEvents, points);

  if (!timingResult.success) {
    return {
      valid: false,
      error: timingResult.error,
    };
  }

  const { startTimingPoint, endTimingPoint, racePoints } = timingResult;

  if (!startTimingPoint || !endTimingPoint || !startTimingPoint.time || !endTimingPoint.time) {
    return { valid: false, error: "Timing points are missing timestamps" };
  }

  const durationSec = Math.round(
    (endTimingPoint.time.getTime() - startTimingPoint.time.getTime()) / 1000
  );

  if (durationSec <= 0) {
    return { valid: false, error: "Calculated duration is zero or negative" };
  }

  const startExits = startEvents.filter(e => e.eventType === 'exit');
  const endExits = endEvents.filter(e => e.eventType === 'exit');

  return {
    valid: true,
    durationSec,
    startPoint: startTimingPoint,
    endPoint: endTimingPoint,
    racePoints,
    nearestStartDistanceM: Math.round(nearestStartDist),
    nearestEndDistanceM: Math.round(nearestEndDist),
    timingDetails: {
      startCircleEntries: startEntries.length,
      startCircleExits: startExits.length,
      endCircleEntries: endEntries.length,
      endCircleExits: endExits.length,
      falseStartDetected: startEntries.length > 1,
      reFinishDetected: endEntries.length > 1,
    },
  };
}

/**
 * Analyzes when a track enters and exits a circular tolerance zone
 */
function analyzeCircleEvents(
  points: GpxPoint[],
  centerLat: number,
  centerLng: number,
  toleranceM: number
): CircleEvent[] {
  const events: CircleEvent[] = [];
  let wasInside = false;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const distance = haversineMeters(point.lat, point.lon, centerLat, centerLng);
    const isInside = distance <= toleranceM;

    if (isInside && !wasInside) {
      // Entering circle
      events.push({
        pointIndex: i,
        point,
        eventType: 'enter',
        distance,
      });
    } else if (!isInside && wasInside) {
      // Exiting circle
      events.push({
        pointIndex: i - 1,
        point: points[i - 1],
        eventType: 'exit',
        distance: haversineMeters(points[i - 1].lat, points[i - 1].lon, centerLat, centerLng),
      });
    }

    wasInside = isInside;
  }

  // Handle case where track ends inside circle
  if (wasInside) {
    const lastPoint = points[points.length - 1];
    events.push({
      pointIndex: points.length - 1,
      point: lastPoint,
      eventType: 'exit',
      distance: haversineMeters(lastPoint.lat, lastPoint.lon, centerLat, centerLng),
    });
  }

  return events;
}

interface TimingResult {
  success: boolean;
  error?: string;
  startTimingPoint?: GpxPoint;
  endTimingPoint?: GpxPoint;
  racePoints?: GpxPoint[];
}

/**
 * Calculate race timing based on circle entry/exit requirements:
 * - Timing starts when leaving start circle (after last start circle entry)
 * - Timing ends when first entering end circle
 * - Handle false starts and re-finishes
 */
function calculateRaceTiming(
  startEvents: CircleEvent[],
  endEvents: CircleEvent[],
  points: GpxPoint[]
): TimingResult {
  const startEntries = startEvents.filter(e => e.eventType === 'enter');
  const startExits = startEvents.filter(e => e.eventType === 'exit');
  const endEntries = endEvents.filter(e => e.eventType === 'enter');

  if (startEntries.length === 0) {
    return { success: false, error: "Track never enters start circle" };
  }

  if (endEntries.length === 0) {
    return { success: false, error: "Track never enters end circle" };
  }

  // Find the timing start point (when leaving start circle after final entry)
  let startTimingPoint: GpxPoint;
  const lastStartEntry = startEntries[startEntries.length - 1];

  // Find the exit event that follows the last entry
  const relevantExits = startExits.filter(exit => exit.pointIndex > lastStartEntry.pointIndex);

  if (relevantExits.length > 0) {
    // Use the first exit after the last entry
    startTimingPoint = relevantExits[0].point;
  } else {
    // If no exit after last entry, the track might still be in start circle
    // Use the point immediately after the last entry
    const nextPointIndex = lastStartEntry.pointIndex + 1;
    if (nextPointIndex < points.length) {
      startTimingPoint = points[nextPointIndex];
    } else {
      return { success: false, error: "Track ends in start circle without exiting" };
    }
  }

  // Find the timing end point (first entry into end circle)
  const endTimingPoint = endEntries[0].point;

  // Ensure timing makes sense chronologically
  if (!startTimingPoint.time || !endTimingPoint.time) {
    return { success: false, error: "Timing points missing timestamps" };
  }

  if (endTimingPoint.time.getTime() <= startTimingPoint.time.getTime()) {
    return { success: false, error: "End timing point occurs before or at start timing point" };
  }

  // Extract race points (between start timing and end timing)
  const startTimingIndex = points.findIndex(p => p === startTimingPoint);
  const endTimingIndex = points.findIndex(p => p === endTimingPoint);

  if (startTimingIndex === -1 || endTimingIndex === -1) {
    return { success: false, error: "Could not locate timing points in track" };
  }

  const racePoints = points.slice(startTimingIndex, endTimingIndex + 1);

  return {
    success: true,
    startTimingPoint,
    endTimingPoint,
    racePoints,
  };
}

export { haversineMeters };