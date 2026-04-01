import { GpxPoint, ParsedGpx } from "./parser";
import { haversineMeters } from "./validator";

export interface EnhancedValidationResult {
  valid: boolean;
  durationSec?: number;
  startPoint?: GpxPoint;
  finishPoint?: GpxPoint;
  /** Track points between when leaving start circle and entering finish circle */
  racePoints?: GpxPoint[];
  nearestStartDistanceM?: number;
  nearestFinishDistanceM?: number;
  error?: string;
  /** Timing details for debugging */
  timingDetails?: {
    startCircleEntries: number;
    startCircleExits: number;
    finishCircleEntries: number;
    finishCircleExits: number;
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
 * - Timing from leaving start circle to entering finish circle
 * - False starts (multiple start circle entries/exits)
 * - Re-finishes (multiple finish circle entries/exits)
 */
export function validateGpxTrackEnhanced(
  gpx: ParsedGpx,
  routeStartLat: number,
  routeStartLng: number,
  routeFinishLat: number,
  routeFinishLng: number,
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
  const finishEvents = analyzeCircleEvents(points, routeFinishLat, routeFinishLng, toleranceM);

  // Find nearest distances for error reporting
  const nearestStartDist = Math.min(...points.map(p =>
    haversineMeters(p.lat, p.lon, routeStartLat, routeStartLng)
  ));
  const nearestFinishDist = Math.min(...points.map(p =>
    haversineMeters(p.lat, p.lon, routeFinishLat, routeFinishLng)
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

  // Check if track enters finish circle
  const finishEntries = finishEvents.filter(e => e.eventType === 'enter');
  if (finishEntries.length === 0) {
    return {
      valid: false,
      nearestFinishDistanceM: Math.round(nearestFinishDist),
      error: `Track does not pass within ${toleranceM}m of route finish (nearest: ${Math.round(nearestFinishDist)}m)`,
    };
  }

  // Determine timing points based on requirements
  const timingResult = calculateRaceTiming(startEvents, finishEvents, points);

  if (!timingResult.success) {
    return {
      valid: false,
      error: timingResult.error,
    };
  }

  const { startTimingPoint, finishTimingPoint, racePoints } = timingResult;

  if (!startTimingPoint || !finishTimingPoint || !startTimingPoint.time || !finishTimingPoint.time) {
    return { valid: false, error: "Timing points are missing timestamps" };
  }

  const durationSec = Math.round(
    (finishTimingPoint.time.getTime() - startTimingPoint.time.getTime()) / 1000
  );

  if (durationSec <= 0) {
    return { valid: false, error: "Calculated duration is zero or negative" };
  }

  const startExits = startEvents.filter(e => e.eventType === 'exit');
  const finishExits = finishEvents.filter(e => e.eventType === 'exit');

  return {
    valid: true,
    durationSec,
    startPoint: startTimingPoint,
    finishPoint: finishTimingPoint,
    racePoints,
    nearestStartDistanceM: Math.round(nearestStartDist),
    nearestFinishDistanceM: Math.round(nearestFinishDist),
    timingDetails: {
      startCircleEntries: startEntries.length,
      startCircleExits: startExits.length,
      finishCircleEntries: finishEntries.length,
      finishCircleExits: finishExits.length,
      falseStartDetected: startEntries.length > 1,
      reFinishDetected: finishEntries.length > 1,
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
  finishTimingPoint?: GpxPoint;
  racePoints?: GpxPoint[];
}

/**
 * Calculate race timing based on circle entry/exit requirements:
 * - Timing starts when leaving start circle (after last start circle entry)
 * - Timing ends when first entering finish circle
 * - Handle false starts and re-finishes
 */
function calculateRaceTiming(
  startEvents: CircleEvent[],
  finishEvents: CircleEvent[],
  points: GpxPoint[]
): TimingResult {
  const startEntries = startEvents.filter(e => e.eventType === 'enter');
  const startExits = startEvents.filter(e => e.eventType === 'exit');
  const finishEntries = finishEvents.filter(e => e.eventType === 'enter');

  if (startEntries.length === 0) {
    return { success: false, error: "Track never enters start circle" };
  }

  if (finishEntries.length === 0) {
    return { success: false, error: "Track never enters finish circle" };
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

  // Find the timing finish point (first entry into finish circle)
  const finishTimingPoint = finishEntries[0].point;

  // Ensure timing makes sense chronologically
  if (!startTimingPoint.time || !finishTimingPoint.time) {
    return { success: false, error: "Timing points missing timestamps" };
  }

  if (finishTimingPoint.time.getTime() <= startTimingPoint.time.getTime()) {
    return { success: false, error: "Finish timing point occurs before or at start timing point" };
  }

  // Extract race points (between start timing and finish timing)
  const startTimingIndex = points.findIndex(p => p === startTimingPoint);
  const finishTimingIndex = points.findIndex(p => p === finishTimingPoint);

  if (startTimingIndex === -1 || finishTimingIndex === -1) {
    return { success: false, error: "Could not locate timing points in track" };
  }

  const racePoints = points.slice(startTimingIndex, finishTimingIndex + 1);

  return {
    success: true,
    startTimingPoint,
    finishTimingPoint,
    racePoints,
  };
}

export { haversineMeters };