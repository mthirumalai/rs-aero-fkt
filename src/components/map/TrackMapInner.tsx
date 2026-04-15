"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { GpxPoint } from "@/lib/gpx/parser";
import { useLeafletInit } from "@/lib/map/leaflet-init";
import { MARKER_ICONS } from "@/lib/map/marker-icons";
import { LayerToggleControl } from "@/components/map/shared/LayerToggleControl";

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

function AnimatedMarker({
  points,
  currentTimeMs,
}: {
  points: GpxPoint[];
  currentTimeMs: number;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const map = useMap();

  // On first render, fit bounds
  useEffect(() => {
    if (points.length > 0) {
      const latlngs = points.map((p) => L.latLng(p.lat, p.lon));
      map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
    }
  }, [points, map]);

  // Update marker position imperatively (avoids React re-renders)
  useEffect(() => {
    if (!markerRef.current || points.length === 0) return;
    const startMs = points[0].time!.getTime();
    const endMs = points[points.length - 1].time!.getTime();
    const clampedMs = Math.max(startMs, Math.min(endMs, currentTimeMs));

    const idx = binarySearch(points, clampedMs);
    const nextIdx = Math.min(idx + 1, points.length - 1);
    const [lat, lng] = interpolate(points[idx], points[nextIdx], clampedMs);
    markerRef.current.setLatLng([lat, lng]);
  }, [currentTimeMs, points]);

  if (points.length === 0) return null;

  const initialPos: [number, number] = [points[0].lat, points[0].lon];

  return (
    <Marker
      position={initialPos}
      icon={boatIcon}
      ref={markerRef}
    />
  );
}

interface Props {
  points: GpxPoint[];
  currentTimeMs: number;
  courseInfo?: CourseInfo | null;
  raceStartIndex?: number;
  raceEndIndex?: number;
}

export default function TrackMapInner({ points, currentTimeMs, courseInfo, raceStartIndex, raceEndIndex }: Props) {
  useLeafletInit();
  const [marine, setMarine] = useState(true);

  const polylineSegments = useMemo(() => {
    const allPositions = points.map((p): [number, number] => [p.lat, p.lon]);

    // If we don't have race indices, return single blue segment
    if (raceStartIndex === undefined || raceEndIndex === undefined || raceStartIndex === null || raceEndIndex === null) {
      return [{ positions: allPositions, color: "#0ea5e9" }];
    }

    const segments = [];

    // Pre-race segment (grey) - up to but not including the start crossing
    if (raceStartIndex > 0) {
      segments.push({
        positions: allPositions.slice(0, raceStartIndex + 1),
        color: "#6b7280" // grey
      });
    }

    // Race segment (blue) - from start crossing to finish crossing
    if (raceStartIndex < raceEndIndex) {
      segments.push({
        positions: allPositions.slice(raceStartIndex, raceEndIndex + 1),
        color: "#0ea5e9" // blue
      });
    }

    // Post-race segment (grey) - after the finish crossing
    if (raceEndIndex < allPositions.length - 1) {
      segments.push({
        positions: allPositions.slice(raceEndIndex + 1),
        color: "#6b7280" // grey
      });
    }

    return segments;
  }, [points, raceStartIndex, raceEndIndex]);

  if (points.length === 0) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        No track data
      </div>
    );
  }

  const center: [number, number] = [points[0].lat, points[0].lon];

  return (
    <div className="relative h-full">
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
        {/* Base layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Marine overlay (conditional) */}
        {marine && (
          <TileLayer
            attribution='&copy; <a href="http://www.openseamap.org">OpenSeaMap</a> contributors'
            url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
            maxZoom={18}
          />
        )}
      {/* Track polylines with color coding */}
      {polylineSegments.map((segment, index) => (
        <Polyline
          key={index}
          positions={segment.positions}
          color={segment.color}
          weight={2}
          opacity={0.8}
        />
      ))}
      <AnimatedMarker points={points} currentTimeMs={currentTimeMs} />

      {/* Course markers and lines */}
      {courseInfo && (
        <>
          {/* Start point/line */}
          <Marker
            position={[courseInfo.startLat, courseInfo.startLng]}
            icon={MARKER_ICONS.start}
          />
          {courseInfo.startType === "LINE" && courseInfo.startLine2Lat && courseInfo.startLine2Lng && (
            <>
              <Marker
                position={[courseInfo.startLine2Lat, courseInfo.startLine2Lng]}
                icon={MARKER_ICONS.start}
              />
              <Polyline
                positions={[[courseInfo.startLat, courseInfo.startLng], [courseInfo.startLine2Lat, courseInfo.startLine2Lng]]}
                color="green"
                weight={4}
                opacity={0.8}
              />
            </>
          )}

          {/* Finish point/line (for ONE_WAY courses) */}
          {courseInfo.courseType === "ONE_WAY" && (
            <>
              <Marker
                position={[courseInfo.finishLat, courseInfo.finishLng]}
                icon={MARKER_ICONS.end}
              />
              {courseInfo.finishType === "LINE" && courseInfo.finishLine2Lat && courseInfo.finishLine2Lng && (
                <>
                  <Marker
                    position={[courseInfo.finishLine2Lat, courseInfo.finishLine2Lng]}
                    icon={MARKER_ICONS.end}
                  />
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

          {/* Turning mark (for OUT_AND_BACK courses) */}
          {courseInfo.courseType === "OUT_AND_BACK" && courseInfo.turningMarkLat && courseInfo.turningMarkLng && (
            <Marker
              position={[courseInfo.turningMarkLat, courseInfo.turningMarkLng]}
              icon={MARKER_ICONS.turningMark}
            />
          )}
        </>
      )}
      </MapContainer>

      {/* Layer toggle control */}
      <LayerToggleControl marine={marine} onToggle={setMarine} />
    </div>
  );
}
