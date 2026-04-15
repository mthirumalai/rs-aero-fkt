"use client";

import { useState, useEffect, useCallback } from "react";
import { MapContainer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Shared utilities
import { useLeafletInit } from "@/lib/map/leaflet-init";
import { getMarkerIcon } from "@/lib/map/marker-icons";
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
  disabled?: boolean;
  onCoordinateChange?: (lat: number, lng: number) => void;
  onCancel?: () => void;
  onSave?: () => void;
}

export default function EditablePointMapInner({
  lat,
  lng,
  name,
  type,
  disabled = false,
  onCoordinateChange,
  onCancel,
  onSave
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
    isEditable: !disabled,
  });

  // Update position when props change
  useEffect(() => {
    if (!isDragging) {
      // The hook should handle this, but keeping for compatibility
      // In a full implementation, we'd enhance the hook to handle prop updates
    }
  }, [lat, lng, isDragging]);

  const handleEscape = useCallback(() => {
    if (isDragging) {
      resetPosition();
      onCancel?.();
    }
  }, [isDragging, resetPosition, onCancel]);

  const handleSaveClick = () => {
    onSave?.();
  };

  const showGhost = !disabled && hasChanges &&
                   (originalLat !== currentLat || originalLng !== currentLng);

  // Get appropriate icons
  const currentIcon = getMarkerIcon(type, false);
  const ghostIcon = getMarkerIcon(type, true);

  return (
    <div className="relative w-full h-full">
      {/* Reusable layer toggle */}
      <LayerToggleControl marine={marine} onToggle={setMarine} />

      {/* Reusable undo/save controls */}
      <UndoSaveControls
        hasChanges={hasChanges && !disabled}
        onUndo={resetPosition}
        onSave={handleSaveClick}
      />

      <MapContainer
        center={[currentLat, currentLng]}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        keyboard={!disabled}
        keyboardPanDelta={80}
      >
        {/* Shared escape key handler */}
        {!disabled && <EscapeKeyHandler onEscape={handleEscape} />}

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

        {/* Current marker */}
        <Marker
          position={[currentLat, currentLng]}
          icon={currentIcon}
          draggable={!disabled}
          eventHandlers={!disabled ? {
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
            {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
            {hasChanges && !disabled && <><br /><em>Unsaved changes</em></>}
          </Popup>
        </Marker>
      </MapContainer>

      {/* Ghost marker styling - could be moved to global CSS */}
      <style jsx global>{`
        .ghost-marker {
          opacity: 0.4 !important;
          filter: grayscale(50%);
        }
        .leaflet-marker-icon:not(.ghost-marker) {
          cursor: ${!disabled ? 'grab' : 'default'} !important;
        }
        .leaflet-marker-icon:not(.ghost-marker):active {
          cursor: ${!disabled ? 'grabbing' : 'default'} !important;
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