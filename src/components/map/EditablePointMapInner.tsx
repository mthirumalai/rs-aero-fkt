"use client";

import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const startIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const endIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const turningMarkIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

// Ghost marker (grayed out version of original position)
const createGhostIcon = (type: "start" | "end" | "turning") => {
  const baseUrl = type === "start"
    ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png"
    : type === "end"
    ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png"
    : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png";

  return new L.Icon({
    iconUrl: baseUrl,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    className: 'ghost-marker'
  });
};

interface Props {
  lat: number | null;
  lng: number | null;
  name: string;
  type: "start" | "end" | "turning";
  onCoordinateChange: (lat: number, lng: number) => void;
  disabled?: boolean;
}

// Component to handle map view updates
function MapViewController({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();

  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.setView([lat, lng], 16, { animate: true });
    }
  }, [map, lat, lng]);

  return null;
}

// Component to handle escape key for canceling drags
function EscapeKeyHandler({ onEscape }: { onEscape: () => void }) {
  useMapEvents({
    keydown: (e) => {
      if (e.originalEvent.key === 'Escape') {
        onEscape();
      }
    }
  });
  return null;
}

export default function EditablePointMapInner({
  lat,
  lng,
  name,
  type,
  onCoordinateChange,
  disabled = false
}: Props) {
  const [marine, setMarine] = useState(true);
  const [currentLat, setCurrentLat] = useState(lat);
  const [currentLng, setCurrentLng] = useState(lng);
  const [originalLat, setOriginalLat] = useState(lat);
  const [originalLng, setOriginalLng] = useState(lng);
  const [isDragging, setIsDragging] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update current position when props change (but not during dragging)
  useEffect(() => {
    if (!isDragging) {
      setCurrentLat(lat);
      setCurrentLng(lng);
      setOriginalLat(lat);
      setOriginalLng(lng);
      setHasChanges(false);
    }
  }, [lat, lng, isDragging]);

  const getIcon = () => {
    switch (type) {
      case "start": return startIcon;
      case "end": return endIcon;
      case "turning": return turningMarkIcon;
      default: return startIcon;
    }
  };

  const handleDragStart = () => {
    if (!disabled) {
      setIsDragging(true);
      setOriginalLat(currentLat);
      setOriginalLng(currentLng);
    }
  };

  const handleDrag = (e: L.LeafletEvent) => {
    if (!disabled) {
      const marker = e.target as L.Marker;
      const position = marker.getLatLng();
      setCurrentLat(position.lat);
      setCurrentLng(position.lng);
    }
  };

  const handleDragEnd = (e: L.LeafletEvent) => {
    if (!disabled) {
      const marker = e.target as L.Marker;
      const position = marker.getLatLng();
      setCurrentLat(position.lat);
      setCurrentLng(position.lng);
      setIsDragging(false);
      setHasChanges(true);

      // Immediately update parent component
      onCoordinateChange(position.lat, position.lng);
    }
  };

  const handleEscape = useCallback(() => {
    if (isDragging && originalLat !== null && originalLng !== null) {
      setCurrentLat(originalLat);
      setCurrentLng(originalLng);
      setIsDragging(false);
      setHasChanges(false);

      // Revert coordinates in parent component
      onCoordinateChange(originalLat, originalLng);
    }
  }, [isDragging, originalLat, originalLng, onCoordinateChange]);

  const handleUndo = () => {
    if (originalLat !== null && originalLng !== null) {
      setCurrentLat(originalLat);
      setCurrentLng(originalLng);
      setHasChanges(false);

      // Update parent component back to original coordinates
      onCoordinateChange(originalLat, originalLng);
    }
  };

  const handleSave = () => {
    if (currentLat !== null && currentLng !== null) {
      // Coordinates are already updated in parent via handleDragEnd
      // This just confirms the changes and resets the "original" position
      setOriginalLat(currentLat);
      setOriginalLng(currentLng);
      setHasChanges(false);
    }
  };

  const hasCoordinates = currentLat !== null && currentLng !== null;
  const showGhost = hasChanges && originalLat !== null && originalLng !== null &&
                   (originalLat !== currentLat || originalLng !== currentLng);

  return (
    <div className="relative w-full h-full">
      {/* Layer toggle */}
      <div className="absolute top-3 right-3 z-[1000] flex rounded overflow-hidden border border-gray-300 shadow-sm text-xs font-medium">
        <button
          onClick={() => setMarine(false)}
          className={`px-3 py-1.5 transition-colors ${!marine ? "bg-primary text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
        >
          Street
        </button>
        <button
          onClick={() => setMarine(true)}
          className={`px-3 py-1.5 transition-colors ${marine ? "bg-primary text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
        >
          Marine
        </button>
      </div>

      {/* Control buttons */}
      {hasChanges && !disabled && (
        <div className="absolute top-3 left-3 z-[1000] flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUndo}
            className="text-xs shadow-sm"
          >
            Undo
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="text-xs shadow-sm"
          >
            Save
          </Button>
        </div>
      )}

      {/* Instructions */}
      {hasCoordinates && !disabled && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 px-2 py-1 rounded text-xs text-gray-600">
          Drag marker to adjust • Press Escape to cancel
        </div>
      )}

      <div className={`w-full h-full ${!hasCoordinates ? 'opacity-40 pointer-events-none' : ''}`}>
        {hasCoordinates ? (
          <MapContainer
            center={[currentLat!, currentLng!]}
            zoom={16}
            style={{ height: "100%", width: "100%" }}
            keyboard={true}
            keyboardPanDelta={80}
          >
            <MapViewController lat={currentLat} lng={currentLng} />
            <EscapeKeyHandler onEscape={handleEscape} />

            {/* Base tile layer */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* OpenSeaMap marine overlay */}
            <TileLayer
              attribution='&copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors'
              url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
              opacity={marine ? 1 : 0}
            />

            {/* Ghost marker (original position) */}
            {showGhost && (
              <Marker
                position={[originalLat!, originalLng!]}
                icon={createGhostIcon(type)}
                interactive={false}
              >
                <Popup>
                  <strong>Original Position</strong><br />
                  {originalLat!.toFixed(6)}, {originalLng!.toFixed(6)}
                </Popup>
              </Marker>
            )}

            {/* Current marker (draggable) */}
            <Marker
              position={[currentLat!, currentLng!]}
              icon={getIcon()}
              draggable={!disabled}
              eventHandlers={{
                dragstart: handleDragStart,
                drag: handleDrag,
                dragend: handleDragEnd,
              }}
            >
              <Popup>
                <strong>{
                  type === "start" ? "Start" :
                  type === "end" ? "End" :
                  "Turning Mark"
                }:</strong> {name}<br />
                {currentLat!.toFixed(6)}, {currentLng!.toFixed(6)}
                {hasChanges && <><br /><em>Unsaved changes</em></>}
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Enter coordinates to display map</p>
              <p className="text-xs mt-1">Map will auto-zoom to location</p>
            </div>
          </div>
        )}
      </div>

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