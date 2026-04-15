"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Polyline, Marker, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GpxPoint } from "@/lib/gpx/parser";

// Shared utilities
import { useLeafletInit } from "@/lib/map/leaflet-init";

// Shared components
import { StandardTileLayers } from "@/components/map/shared/StandardTileLayers";

// Create specialized icons for track visualization
const createTrackPointIcon = (selectionMode: "start" | "end" | null) => new L.DivIcon({
  className: "",
  html: `<div style="
    width:${selectionMode ? '14px' : '10px'};
    height:${selectionMode ? '14px' : '10px'};
    background:${selectionMode ? '#374151' : '#6b7280'};
    border:2px solid white;
    border-radius:50%;
    cursor:pointer;
    transition:all 0.2s;
    box-shadow: 0 0 6px rgba(0,0,0,0.5);
    ${selectionMode ? 'animation: pulse 1s infinite;' : ''}
  " class="track-point"></div>
  ${selectionMode ? '<style>@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }</style>' : ''}`,
  iconSize: [selectionMode ? 14 : 10, selectionMode ? 14 : 10],
  iconAnchor: [selectionMode ? 7 : 5, selectionMode ? 7 : 5],
});

const startPointIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    width:16px;height:16px;
    background:#10b981;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 8px rgba(16,185,129,0.5);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const finishPointIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    width:16px;height:16px;
    background:#ef4444;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 8px rgba(239,68,68,0.5);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const hoveredPointIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    width:16px;height:16px;
    background:#3b82f6;
    border:2px solid white;
    border-radius:50%;
    box-shadow:0 0 8px rgba(59,130,246,0.5);
    cursor:pointer;
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapContent({
  points,
  selectedStartIndex,
  selectedEndIndex,
  onPointSelect,
  selectionMode,
  hoveredIndex,
  onPointHover,
  onPointLeave,
}: {
  points: GpxPoint[];
  selectedStartIndex: number | null;
  selectedEndIndex: number | null;
  onPointSelect: (index: number) => void;
  selectionMode: "start" | "end" | null;
  hoveredIndex: number | null;
  onPointHover: (index: number | null) => void;
  onPointLeave: () => void;
}) {
  const map = useMap();

  // Auto-fit bounds to track
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, points]);

  // Sample points for performance (every 10th point)
  const sampledPoints = useMemo(() => {
    if (!points || points.length === 0) return [];
    const step = Math.max(1, Math.floor(points.length / 50));
    return points.filter((_, i) => i % step === 0);
  }, [points]);

  return (
    <>
      {/* Track polyline */}
      {points && points.length > 1 && (
        <Polyline
          positions={points.map(p => [p.lat, p.lng])}
          color="#0ea5e9"
          weight={3}
          opacity={0.8}
        />
      )}

      {/* Interactive track points */}
      {sampledPoints.map((point, sampledIndex) => {
        // Find actual index in original array
        const actualIndex = points.findIndex(p => p === point);
        const isSelected = actualIndex === selectedStartIndex || actualIndex === selectedEndIndex;
        const isHovered = actualIndex === hoveredIndex;

        // Determine icon
        let icon;
        if (actualIndex === selectedStartIndex) {
          icon = startPointIcon;
        } else if (actualIndex === selectedEndIndex) {
          icon = finishPointIcon;
        } else if (isHovered) {
          icon = hoveredPointIcon;
        } else {
          icon = createTrackPointIcon(selectionMode);
        }

        return (
          <Marker
            key={`point-${actualIndex}`}
            position={[point.lat, point.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onPointSelect(actualIndex),
              mouseover: () => onPointHover(actualIndex),
              mouseout: onPointLeave,
            }}
          />
        );
      })}
    </>
  );
}

interface Props {
  points: GpxPoint[];
  selectedStartIndex: number | null;
  selectedEndIndex: number | null;
  onPointSelect: (index: number) => void;
  selectionMode: "start" | "end" | null;
  hoveredIndex: number | null;
  onPointHover: (index: number | null) => void;
  onPointLeave: () => void;
}

export default function CourseCreationMapInner({
  points,
  selectedStartIndex,
  selectedEndIndex,
  onPointSelect,
  selectionMode,
  hoveredIndex,
  onPointHover,
  onPointLeave,
}: Props) {
  // Initialize Leaflet
  useLeafletInit();

  if (!points || points.length === 0) {
    return (
      <div className="h-[400px] bg-muted flex items-center justify-center">
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
      style={{ height: "400px", width: "100%" }}
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

      <MapContent
        points={points}
        selectedStartIndex={selectedStartIndex}
        selectedEndIndex={selectedEndIndex}
        onPointSelect={onPointSelect}
        selectionMode={selectionMode}
        hoveredIndex={hoveredIndex}
        onPointHover={onPointHover}
        onPointLeave={onPointLeave}
      />
    </MapContainer>
  );
}