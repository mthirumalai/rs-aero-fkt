"use client";

import { useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GpxPoint } from "@/lib/gpx/parser";

// Fix marker icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const boatIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    width:14px;height:14px;
    background:#0ea5e9;
    border:2px solid white;
    border-radius:50%;
    box-shadow:0 0 4px rgba(0,0,0,0.4)
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
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
}

export default function TrackMapInner({ points, currentTimeMs }: Props) {
  const polyline = useMemo(
    () => points.map((p): [number, number] => [p.lat, p.lon]),
    [points]
  );

  if (points.length === 0) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        No track data
      </div>
    );
  }

  const center: [number, number] = [points[0].lat, points[0].lon];

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={polyline} color="#0ea5e9" weight={2} opacity={0.8} />
      <AnimatedMarker points={points} currentTimeMs={currentTimeMs} />
    </MapContainer>
  );
}
