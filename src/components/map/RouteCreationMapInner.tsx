"use client";

import { useEffect, useMemo } from "react";
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

// Create icons dynamically to ensure they're visible
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

const endPointIcon = new L.DivIcon({
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
}: {
  points: GpxPoint[];
  selectedStartIndex: number | null;
  selectedEndIndex: number | null;
  onPointSelect: (index: number, type: "start" | "end") => void;
  selectionMode: "start" | "end" | null;
}) {
  const map = useMap();

  // Fit bounds on first render
  useEffect(() => {
    if (points.length > 0) {
      const latlngs = points.map((p) => L.latLng(p.lat, p.lon));
      map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
    }
  }, [points, map]);

  const trackMarkers = useMemo(() => {
    // Show more frequent points for better interactivity
    const markersToShow: number[] = [];
    const interval = Math.max(1, Math.floor(points.length / 50)); // Show ~50 points max
    for (let i = 0; i < points.length; i += interval) {
      markersToShow.push(i);
    }
    if (!markersToShow.includes(points.length - 1)) {
      markersToShow.push(points.length - 1);
    }

    return markersToShow.map((index) => {
      const point = points[index];
      const isSelected = index === selectedStartIndex || index === selectedEndIndex;

      let icon;
      if (index === selectedStartIndex) icon = startPointIcon;
      else if (index === selectedEndIndex) icon = endPointIcon;
      else icon = createTrackPointIcon(selectionMode);

      return (
        <Marker
          key={`track-${index}`}
          position={[point.lat, point.lon]}
          icon={icon}
          eventHandlers={{
            click: () => {
              if (selectionMode) {
                onPointSelect(index, selectionMode);
              }
            },
            mouseover: (e) => {
              if (!isSelected && selectionMode) {
                e.target.setIcon(hoveredPointIcon);
              }
            },
            mouseout: (e) => {
              if (!isSelected) {
                e.target.setIcon(createTrackPointIcon(selectionMode));
              }
            },
          }}
        />
      );
    });
  }, [points, selectedStartIndex, selectedEndIndex, onPointSelect, selectionMode]);

  return (
    <>
      {trackMarkers}
    </>
  );
}

interface Props {
  points: GpxPoint[];
  selectedStartIndex: number | null;
  selectedEndIndex: number | null;
  onPointSelect: (index: number, type: "start" | "end") => void;
  selectionMode: "start" | "end" | null;
}

export default function RouteCreationMapInner({ points, selectedStartIndex, selectedEndIndex, onPointSelect, selectionMode }: Props) {
  const polyline = useMemo(
    () => points.map((p): [number, number] => [p.lat, p.lon]),
    [points]
  );

  if (points.length === 0) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        Upload a GPX file to see the track
      </div>
    );
  }

  const center: [number, number] = [points[0].lat, points[0].lon];

  const cursorClass = selectionMode ? "cursor-crosshair" : "cursor-default";

  return (
    <div className={`w-full h-full ${cursorClass}`}>
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={polyline} color="#0ea5e9" weight={3} opacity={0.7} />
        <MapContent
          points={points}
          selectedStartIndex={selectedStartIndex}
          selectedEndIndex={selectedEndIndex}
          onPointSelect={onPointSelect}
          selectionMode={selectionMode}
        />
      </MapContainer>
    </div>
  );
}