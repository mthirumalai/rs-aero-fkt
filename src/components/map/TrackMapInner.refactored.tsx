"use client";

import { useEffect, useRef, useMemo } from "react";
import { MapContainer, Polyline, Marker, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GpxPoint } from "@/lib/gpx/parser";

// Shared utilities
import { useLeafletInit } from "@/lib/map/leaflet-init";
import { MARKER_ICONS } from "@/lib/map/marker-icons";

// Shared components
import { StandardTileLayers } from "@/components/map/shared/StandardTileLayers";

interface CourseInfo {
  startLat: number;
  startLng: number;
  startType: "POINT" | "LINE";
  startLine2Lat?: number;
  startLine2Lng?: number;
  finishLat: number;
  finishLng: number;
  finishType: "POINT" | "LINE";
  finishLine2Lat?: number;
  finishLine2Lng?: number;
  turningMarkLat?: number;
  turningMarkLng?: number;
  courseType: "ONE_WAY" | "OUT_AND_BACK";
}

// Unique boat icon for animated playback (preserve original design)
const boatIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    width:20px;height:20px;
    background:#ec4899;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 4px rgba(0,0,0,0.4)
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Binary search: find index of largest point.time <= targetMs
function binarySearch(points: GpxPoint[], targetMs: number): number {
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (points[mid].time!.getTime() <= targetMs) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

// Linearly interpolate position between two adjacent points
function interpolate(
  p1: GpxPoint,
  p2: GpxPoint,
  targetMs: number
): [number, number] {
  const t1 = p1.time!.getTime();
  const t2 = p2.time!.getTime();
  if (t2 === t1) return [p1.lat, p1.lon];
  const frac = (targetMs - t1) / (t2 - t1);
  return [
    p1.lat + (p2.lat - p1.lat) * frac,
    p1.lon + (p2.lon - p1.lon) * frac,
  ];
}

function TrackContent({
  points,
  currentTime,
  raceStartIndex,
  raceEndIndex,
  courseInfo,
}: {
  points: GpxPoint[];
  currentTime: number;
  raceStartIndex?: number;
  raceEndIndex?: number;
  courseInfo?: CourseInfo;
}) {
  const map = useMap();
  const boatMarkerRef = useRef<L.Marker | null>(null);

  // Auto-fit bounds to track
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, points]);

  // Update boat position based on current time
  useEffect(() => {
    if (!points || points.length === 0 || !points[0].time) return;

    const startTime = points[0].time.getTime();
    const endTime = points[points.length - 1].time.getTime();
    const targetMs = startTime + (endTime - startTime) * currentTime;

    if (targetMs < startTime) return;

    const idx = binarySearch(points, targetMs);
    let position: [number, number];

    if (idx === points.length - 1 || !points[idx + 1]) {
      position = [points[idx].lat, points[idx].lon];
    } else {
      position = interpolate(points[idx], points[idx + 1], targetMs);
    }

    if (boatMarkerRef.current) {
      boatMarkerRef.current.setLatLng(position);
    }
  }, [points, currentTime]);

  // Create track segments with color coding
  const trackSegments = useMemo(() => {
    if (!points || points.length < 2) return [];

    const segments = [];

    // Helper function to create segment
    const createSegment = (start: number, end: number, color: string, weight: number = 3, opacity: number = 0.8) => {
      if (start < end && start < points.length && end <= points.length) {
        const segmentPoints = points.slice(start, end).map(p => [p.lat, p.lng] as [number, number]);
        if (segmentPoints.length >= 2) {
          return { points: segmentPoints, color, weight, opacity };
        }
      }
      return null;
    };

    if (raceStartIndex !== undefined && raceEndIndex !== undefined) {
      // Pre-race segment (grey)
      if (raceStartIndex > 0) {
        const preRace = createSegment(0, raceStartIndex + 1, "#6b7280");
        if (preRace) segments.push(preRace);
      }

      // Race segment (blue) - this is the FKT attempt portion
      const race = createSegment(raceStartIndex, raceEndIndex + 1, "#0ea5e9", 4, 1.0);
      if (race) segments.push(race);

      // Post-race segment (grey)
      if (raceEndIndex < points.length - 1) {
        const postRace = createSegment(raceEndIndex, points.length, "#6b7280");
        if (postRace) segments.push(postRace);
      }
    } else {
      // No race indices, show entire track in blue
      const fullTrack = createSegment(0, points.length, "#0ea5e9", 4, 1.0);
      if (fullTrack) segments.push(fullTrack);
    }

    return segments;
  }, [points, raceStartIndex, raceEndIndex]);

  // Calculate initial boat position
  const initialPosition = useMemo(() => {
    if (!points || points.length === 0) return [0, 0] as [number, number];
    return [points[0].lat, points[0].lng] as [number, number];
  }, [points]);

  return (
    <>
      {/* Render track segments with color coding */}
      {trackSegments.map((segment, index) => (
        <Polyline
          key={index}
          positions={segment.points}
          color={segment.color}
          weight={segment.weight}
          opacity={segment.opacity}
        />
      ))}

      {/* Course markers using shared icons */}
      {courseInfo && (
        <>
          {/* Start marker */}
          <Marker position={[courseInfo.startLat, courseInfo.startLng]} icon={MARKER_ICONS.start} />

          {/* Start line second marker (if LINE type) */}
          {courseInfo.startType === "LINE" && courseInfo.startLine2Lat && courseInfo.startLine2Lng && (
            <>
              <Marker position={[courseInfo.startLine2Lat, courseInfo.startLine2Lng]} icon={MARKER_ICONS.start} />
              <Polyline
                positions={[[courseInfo.startLat, courseInfo.startLng], [courseInfo.startLine2Lat, courseInfo.startLine2Lng]]}
                color="green"
                weight={4}
                opacity={0.8}
              />
            </>
          )}

          {/* Finish or turning mark */}
          {courseInfo.courseType === "OUT_AND_BACK" && courseInfo.turningMarkLat && courseInfo.turningMarkLng ? (
            <Marker position={[courseInfo.turningMarkLat, courseInfo.turningMarkLng]} icon={MARKER_ICONS.turningMark} />
          ) : (
            <>
              <Marker position={[courseInfo.finishLat, courseInfo.finishLng]} icon={MARKER_ICONS.end} />
              {courseInfo.finishType === "LINE" && courseInfo.finishLine2Lat && courseInfo.finishLine2Lng && (
                <>
                  <Marker position={[courseInfo.finishLine2Lat, courseInfo.finishLine2Lng]} icon={MARKER_ICONS.end} />
                  <Polyline
                    positions={[[courseInfo.finishLat, courseInfo.finishLng], [courseInfo.finishLine2Lat, courseInfo.finishLine2Lng]]}
                    color="red"
                    weight={4}
                    opacity={0.8}
                  />
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Animated boat marker */}
      <Marker
        position={initialPosition}
        icon={boatIcon}
        ref={boatMarkerRef}
      />
    </>
  );
}

interface Props {
  points: GpxPoint[];
  currentTime: number;
  raceStartIndex?: number;
  raceEndIndex?: number;
  courseInfo?: CourseInfo;
}

export default function TrackMapInner({
  points,
  currentTime,
  raceStartIndex,
  raceEndIndex,
  courseInfo,
}: Props) {
  // Initialize Leaflet
  useLeafletInit();

  if (!points || points.length === 0) {
    return (
      <div className="h-full bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">No track data to display</p>
      </div>
    );
  }

  // Calculate center from track points
  const center: [number, number] = [
    points[Math.floor(points.length / 2)]?.lat || 0,
    points[Math.floor(points.length / 2)]?.lng || 0
  ];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
    >
      {/* Layer control for marine/street toggle */}
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Marine Chart">
          <StandardTileLayers marineOpacity={1} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Street Map">
          <StandardTileLayers marineOpacity={0} />
        </LayersControl.BaseLayer>
      </LayersControl>

      <TrackContent
        points={points}
        currentTime={currentTime}
        raceStartIndex={raceStartIndex}
        raceEndIndex={raceEndIndex}
        courseInfo={courseInfo}
      />
    </MapContainer>
  );
}