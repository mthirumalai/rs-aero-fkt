"use client";

import { useState, useEffect, useCallback } from "react";
import { MapContainer, Marker, Popup, Polyline, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { VALIDATION_TOLERANCE_METERS } from "@/lib/gpx/constants";

// Shared utilities
import { useLeafletInit } from "@/lib/map/leaflet-init";
import { MARKER_ICONS, getMarkerIcon } from "@/lib/map/marker-icons";
import { useDraggableMarker } from "@/hooks/useDraggableMarker";

// Shared components
import { LayerToggleControl } from "@/components/map/shared/LayerToggleControl";
import { EscapeKeyHandler } from "@/components/map/shared/EscapeKeyHandler";
import { StandardTileLayers } from "@/components/map/shared/StandardTileLayers";
import { UndoSaveControls } from "@/components/map/shared/UndoSaveControls";

interface Props {
  lat: number;
  lng: number;
  name: string;
  type: "start" | "end" | "turning";
  pointType?: "POINT" | "LINE";
  lat2?: number;
  lng2?: number;
  editable?: boolean;
  onCoordinateChange?: (lat: number, lng: number) => void;
}

export default function PointMapInner({
  lat,
  lng,
  name,
  type,
  pointType = "POINT",
  lat2,
  lng2,
  editable = false,
  onCoordinateChange
}: Props) {
  // Initialize Leaflet
  useLeafletInit();

  const [marine, setMarine] = useState(true);

  // Use shared draggable marker hook
  const {
    currentLat,
    currentLng,
    isDragging,
    hasChanges,
    originalLat,
    originalLng,
    handleDragStart,
    handleDrag,
    handleDragEnd,
    resetPosition,
  } = useDraggableMarker({
    initialLat: lat,
    initialLng: lng,
    onCoordinateChange,
    isEditable: editable,
  });

  // Update position when props change (but not during dragging)
  useEffect(() => {
    if (!isDragging) {
      // Note: This would need to be added to the hook for full compatibility
      // For now, this demonstrates the concept
    }
  }, [lat, lng, isDragging]);

  const handleEscape = useCallback(() => {
    if (isDragging) {
      resetPosition();
    }
  }, [isDragging, resetPosition]);

  const handleSave = () => {
    // Coordinates are already updated via handleDragEnd
    // This confirms the changes
    console.log("Save confirmed");
  };

  const showGhost = editable && hasChanges &&
                   (originalLat !== currentLat || originalLng !== currentLng);

  // Get the appropriate icon using shared utility
  const currentIcon = getMarkerIcon(type as keyof typeof MARKER_ICONS);
  const ghostIcon = getMarkerIcon(type as keyof typeof MARKER_ICONS, true);

  return (
    <div className="relative w-full h-full">
      {/* Reusable layer toggle */}
      <LayerToggleControl marine={marine} onToggle={setMarine} />

      {/* Reusable undo/save controls */}
      <UndoSaveControls
        hasChanges={hasChanges}
        onUndo={resetPosition}
        onSave={handleSave}
      />

      {/* Instructions */}
      {editable && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 px-2 py-1 rounded text-xs text-gray-600">
          Drag marker to adjust • Press Escape to cancel
        </div>
      )}

      <MapContainer
        center={[currentLat, currentLng]}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        keyboard={editable}
        keyboardPanDelta={80}
      >
        {/* Shared escape key handler */}
        {editable && <EscapeKeyHandler onEscape={handleEscape} />}

        {/* Shared tile layers */}
        <StandardTileLayers marineOpacity={marine ? 1 : 0} />

        {/* Ghost marker (original position) */}
        {showGhost && (
          <Marker
            position={[originalLat, originalLng]}
            icon={ghostIcon}
            interactive={false}
          >
            <Popup>
              <strong>Original Position</strong><br />
              {originalLat.toFixed(6)}, {originalLng.toFixed(6)}
            </Popup>
          </Marker>
        )}

        {/* Validation tolerance circle around start and finish markers */}
        {(type === "start" || type === "end") && (
          <Circle
            center={[currentLat, currentLng]}
            radius={VALIDATION_TOLERANCE_METERS}
            color="#3b82f6"
            weight={2}
            opacity={0.6}
            fillOpacity={0.1}
          />
        )}

        {/* Current marker (draggable if editable) */}
        <Marker
          position={[currentLat, currentLng]}
          icon={currentIcon}
          draggable={editable}
          eventHandlers={editable ? {
            dragstart: handleDragStart,
            drag: handleDrag,
            dragend: handleDragEnd,
          } : {}}
        >
          <Popup>
            <strong>{
              type === "start" ? "Start" :
              type === "end" ? "End" :
              "Turning Mark"
            }:</strong> {name}<br />
            {pointType === "LINE" ? "Line Start: " : ""}{editable ? currentLat.toFixed(6) : lat.toFixed(6)}, {editable ? currentLng.toFixed(6) : lng.toFixed(6)}
            {editable && hasChanges && <><br /><em>Unsaved changes</em></>}
          </Popup>
        </Marker>

        {/* Line markers for LINE type points */}
        {pointType === "LINE" && lat2 !== undefined && lng2 !== undefined && (
          <>
            <Marker
              position={[lat2, lng2]}
              icon={currentIcon}
            >
              <Popup>
                <strong>{
                  type === "start" ? "Start" :
                  type === "end" ? "End" :
                  "Turning Mark"
                }:</strong> {name}<br />
                Line End: {lat2.toFixed(6)}, {lng2.toFixed(6)}
              </Popup>
            </Marker>
            <Polyline
              positions={[[lat, lng], [lat2, lng2]]}
              color={type === "start" ? "green" : type === "end" ? "red" : "blue"}
              weight={4}
              opacity={0.8}
            />
          </>
        )}
      </MapContainer>

      {/* Ghost marker styling - could be moved to global CSS */}
      <style jsx global>{`
        .ghost-marker {
          opacity: 0.4 !important;
          filter: grayscale(50%);
        }
        .leaflet-marker-icon:not(.ghost-marker) {
          cursor: ${editable ? 'grab' : 'default'} !important;
        }
        .leaflet-marker-icon:not(.ghost-marker):active {
          cursor: ${editable ? 'grabbing' : 'default'} !important;
        }
        .leaflet-container {
          cursor: default;
        }
        .leaflet-grab {
          cursor: grab !important;
        }
        .leaflet-grabbing {
          cursor: grabbing !important;
        }
      `}</style>
    </div>
  );
}