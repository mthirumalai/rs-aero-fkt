"use client";

import { useState } from "react";
import { MapContainer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Shared utilities
import { useLeafletInit } from "@/lib/map/leaflet-init";
import { MARKER_ICONS } from "@/lib/map/marker-icons";

// Shared components
import { LayerToggleControl } from "@/components/map/shared/LayerToggleControl";
import { StandardTileLayers } from "@/components/map/shared/StandardTileLayers";
import { FitBoundsComponent } from "@/components/map/shared/FitBoundsComponent";

interface Props {
  startLat: number; startLng: number; finishLat: number; finishLng: number;
  startName: string; finishName: string;
  courseType?: "ONE_WAY" | "OUT_AND_BACK";
  startType?: "POINT" | "LINE";
  startLine2Lat?: number | null;
  startLine2Lng?: number | null;
  finishType?: "POINT" | "LINE";
  finishLine2Lat?: number | null;
  finishLine2Lng?: number | null;
  turningMarkLat?: number | null;
  turningMarkLng?: number | null;
  turningMarkName?: string | null;
}

export default function CourseMapInner({
  startLat, startLng, finishLat, finishLng, startName, finishName,
  courseType, startType = "POINT", startLine2Lat, startLine2Lng,
  finishType = "POINT", finishLine2Lat, finishLine2Lng,
  turningMarkLat, turningMarkLng, turningMarkName
}: Props) {
  // Initialize Leaflet
  useLeafletInit();

  const [marine, setMarine] = useState(true);

  // Calculate center including turning mark if present
  const centerLat = turningMarkLat && courseType === "OUT_AND_BACK"
    ? (startLat + turningMarkLat) / 2
    : (startLat + finishLat) / 2;
  const centerLng = turningMarkLng && courseType === "OUT_AND_BACK"
    ? (startLng + turningMarkLng) / 2
    : (startLng + finishLng) / 2;
  const center: [number, number] = [centerLat, centerLng];

  return (
    <div className="relative w-full h-full">
      {/* Reusable layer toggle */}
      <LayerToggleControl marine={marine} onToggle={setMarine} />

      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        {/* Shared auto-fit bounds */}
        <FitBoundsComponent
          startLat={startLat}
          startLng={startLng}
          finishLat={finishLat}
          finishLng={finishLng}
          turningMarkLat={turningMarkLat}
          turningMarkLng={turningMarkLng}
          startLine2Lat={startLine2Lat}
          startLine2Lng={startLine2Lng}
          finishLine2Lat={finishLine2Lat}
          finishLine2Lng={finishLine2Lng}
          padding={[40, 40]}
        />

        {/* Shared tile layers */}
        <StandardTileLayers marineOpacity={marine ? 1 : 0} />

        {/* Start marker */}
        <Marker position={[startLat, startLng]} icon={MARKER_ICONS.start}>
          <Popup>
            <strong>{courseType === "OUT_AND_BACK" ? "Start/Finish:" : "Start:"}</strong> {startName}<br />
            {startType === "LINE" ? "Line Start: " : ""}{startLat.toFixed(6)}, {startLng.toFixed(6)}
          </Popup>
        </Marker>

        {/* Start line second marker (if LINE type) */}
        {startType === "LINE" && startLine2Lat !== null && startLine2Lng !== null && (
          <>
            <Marker position={[startLine2Lat, startLine2Lng]} icon={MARKER_ICONS.start}>
              <Popup>
                <strong>{courseType === "OUT_AND_BACK" ? "Start/Finish:" : "Start:"}</strong> {startName}<br />
                Line End: {startLine2Lat.toFixed(6)}, {startLine2Lng.toFixed(6)}
              </Popup>
            </Marker>
            <Polyline
              positions={[[startLat, startLng], [startLine2Lat, startLine2Lng]]}
              color="green"
              weight={4}
              opacity={0.8}
            />
          </>
        )}

        {/* For OUT_AND_BACK: Show turning mark and route line to turning mark */}
        {courseType === "OUT_AND_BACK" && turningMarkLat !== null && turningMarkLng !== null && (
          <>
            <Marker position={[turningMarkLat, turningMarkLng]} icon={MARKER_ICONS.turningMark}>
              <Popup>
                <strong>Turning Mark:</strong> {turningMarkName || "Turning Mark"}<br />
                {turningMarkLat.toFixed(6)}, {turningMarkLng.toFixed(6)}
              </Popup>
            </Marker>
            <Polyline
              positions={[[startLat, startLng], [turningMarkLat, turningMarkLng]]}
              color="#3b82f6"
              weight={3}
              opacity={0.7}
              dashArray="8 4"
            />
          </>
        )}

        {/* For ONE_WAY: Show finish marker and route line to finish */}
        {courseType === "ONE_WAY" && (
          <>
            <Marker position={[finishLat, finishLng]} icon={MARKER_ICONS.end}>
              <Popup>
                <strong>Finish:</strong> {finishName}<br />
                {finishType === "LINE" ? "Line Start: " : ""}{finishLat.toFixed(6)}, {finishLng.toFixed(6)}
              </Popup>
            </Marker>

            {/* Finish line second marker (if LINE type) */}
            {finishType === "LINE" && finishLine2Lat !== null && finishLine2Lng !== null && (
              <>
                <Marker position={[finishLine2Lat, finishLine2Lng]} icon={MARKER_ICONS.end}>
                  <Popup>
                    <strong>Finish:</strong> {finishName}<br />
                    Line End: {finishLine2Lat.toFixed(6)}, {finishLine2Lng.toFixed(6)}
                  </Popup>
                </Marker>
                <Polyline
                  positions={[[finishLat, finishLng], [finishLine2Lat, finishLine2Lng]]}
                  color="red"
                  weight={4}
                  opacity={0.8}
                />
              </>
            )}

            {/* Route line from start to finish */}
            <Polyline
              positions={[[startLat, startLng], [finishLat, finishLng]]}
              color="#3b82f6"
              weight={3}
              opacity={0.7}
              dashArray="8 4"
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}