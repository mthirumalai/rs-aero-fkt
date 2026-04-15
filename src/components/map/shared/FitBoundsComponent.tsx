import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

interface FitBoundsComponentProps {
  startLat: number;
  startLng: number;
  finishLat: number;
  finishLng: number;
  turningMarkLat?: number | null;
  turningMarkLng?: number | null;
  startLine2Lat?: number | null;
  startLine2Lng?: number | null;
  finishLine2Lat?: number | null;
  finishLine2Lng?: number | null;
  padding?: [number, number];
}

/**
 * Reusable component for automatically fitting map bounds to course markers
 * This replaces the repeated FitBounds logic found in multiple map components
 */
export function FitBoundsComponent({
  startLat,
  startLng,
  finishLat,
  finishLng,
  turningMarkLat,
  turningMarkLng,
  startLine2Lat,
  startLine2Lng,
  finishLine2Lat,
  finishLine2Lng,
  padding = [60, 60],
}: FitBoundsComponentProps) {
  const map = useMap();

  useEffect(() => {
    const points = [
      [startLat, startLng],
      [finishLat, finishLng]
    ] as [number, number][];

    // Add optional points if they exist
    if (turningMarkLat != null && turningMarkLng != null) {
      points.push([turningMarkLat, turningMarkLng]);
    }
    if (startLine2Lat != null && startLine2Lng != null) {
      points.push([startLine2Lat, startLine2Lng]);
    }
    if (finishLine2Lat != null && finishLine2Lng != null) {
      points.push([finishLine2Lat, finishLine2Lng]);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding });
    }
  }, [
    map,
    startLat,
    startLng,
    finishLat,
    finishLng,
    turningMarkLat,
    turningMarkLng,
    startLine2Lat,
    startLine2Lng,
    finishLine2Lat,
    finishLine2Lng,
    padding,
  ]);

  return null;
}