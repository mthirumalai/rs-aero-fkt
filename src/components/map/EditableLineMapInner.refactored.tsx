"use client";

import { useState, useCallback, useEffect } from "react";
import { MapContainer, Marker, Polyline, useMapEvents, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Shared utilities
import { useLeafletInit } from "@/lib/map/leaflet-init";
import { MARKER_ICONS } from "@/lib/map/marker-icons";

// Shared components
import { StandardTileLayers } from "@/components/map/shared/StandardTileLayers";
import { UndoSaveControls } from "@/components/map/shared/UndoSaveControls";

interface Props {
  type: "POINT" | "LINE";
  lat: number;
  lng: number;
  lat2?: number;
  lng2?: number;
  purpose: "start" | "finish";
  onLocationChange: (lat: number, lng: number, lat2?: number, lng2?: number) => void;
}

function MapClickHandler({ type, onLocationChange }: {
  type: "POINT" | "LINE",
  onLocationChange: (lat: number, lng: number, lat2?: number, lng2?: number) => void
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [firstPoint, setFirstPoint] = useState<[number, number] | null>(null);

  useMapEvents({
    click: (e) => {
      if (type === "POINT") {
        // For points, just set the location
        onLocationChange(e.latlng.lat, e.latlng.lng);
      } else if (type === "LINE") {
        if (!isDrawing) {
          // Start drawing a line
          setIsDrawing(true);
          setFirstPoint([e.latlng.lat, e.latlng.lng]);
          onLocationChange(e.latlng.lat, e.latlng.lng, e.latlng.lat, e.latlng.lng);
        } else {
          // Finish drawing the line
          setIsDrawing(false);
          setFirstPoint(null);
          onLocationChange(firstPoint![0], firstPoint![1], e.latlng.lat, e.latlng.lng);
        }
      }
    },
  });

  return null;
}

export default function EditableLineMapInner({ type, lat, lng, lat2, lng2, purpose, onLocationChange }: Props) {
  // Initialize Leaflet
  useLeafletInit();

  // Local state for undo/save functionality
  const [originalCoords, setOriginalCoords] = useState({ lat, lng, lat2, lng2 });
  const [currentCoords, setCurrentCoords] = useState({ lat, lng, lat2, lng2 });
  const [hasChanges, setHasChanges] = useState(false);

  // Update original coordinates when props change from parent
  useEffect(() => {
    const newCoords = { lat, lng, lat2, lng2 };
    setOriginalCoords(newCoords);
    setCurrentCoords(newCoords);
    setHasChanges(false);
  }, [lat, lng, lat2, lng2]);

  const handleMarkerDrag = useCallback((event: L.DragEndEvent, isSecondPoint: boolean = false) => {
    const marker = event.target;
    const position = marker.getLatLng();

    let newCoords;
    if (type === "POINT") {
      newCoords = { lat: position.lat, lng: position.lng, lat2, lng2 };
    } else if (type === "LINE") {
      if (isSecondPoint) {
        newCoords = { lat: currentCoords.lat, lng: currentCoords.lng, lat2: position.lat, lng2: position.lng };
      } else {
        newCoords = { lat: position.lat, lng: position.lng, lat2: currentCoords.lat2, lng2: currentCoords.lng2 };
      }
    }

    if (newCoords) {
      setCurrentCoords(newCoords);
      setHasChanges(true);
    }
  }, [type, currentCoords, lat2, lng2]);

  const handleLocationUpdate = useCallback((newLat: number, newLng: number, newLat2?: number, newLng2?: number) => {
    const newCoords = { lat: newLat, lng: newLng, lat2: newLat2, lng2: newLng2 };
    setCurrentCoords(newCoords);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    onLocationChange(currentCoords.lat, currentCoords.lng, currentCoords.lat2, currentCoords.lng2);
    setOriginalCoords(currentCoords);
    setHasChanges(false);
  }, [currentCoords, onLocationChange]);

  const handleUndo = useCallback(() => {
    setCurrentCoords(originalCoords);
    setHasChanges(false);
  }, [originalCoords]);

  // Determine colors based on purpose
  const primaryIcon = purpose === "start" ? MARKER_ICONS.start : MARKER_ICONS.end;
  const lineColor = purpose === "start" ? "green" : "red";

  const center: [number, number] = [currentCoords.lat, currentCoords.lng];

  return (
    <div>
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: "300px", width: "100%" }}
      >
        <MapClickHandler
          type={type}
          onLocationChange={handleLocationUpdate}
        />

        {/* Using LayersControl for this component as it was originally designed */}
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Marine Chart">
            <StandardTileLayers marineOpacity={1} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Street Map">
            <StandardTileLayers marineOpacity={0} />
          </LayersControl.BaseLayer>
          <LayersControl.Overlay checked name="Nautical Information">
            {/* This is handled by StandardTileLayers marine overlay */}
          </LayersControl.Overlay>
        </LayersControl>

        {/* First marker (always present) */}
        <Marker
          position={[currentCoords.lat, currentCoords.lng]}
          icon={primaryIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => handleMarkerDrag(e, false)
          }}
        />

        {/* Second marker and line (only for LINE type) */}
        {type === "LINE" && currentCoords.lat2 !== undefined && currentCoords.lng2 !== undefined && (
          <>
            <Marker
              position={[currentCoords.lat2, currentCoords.lng2]}
              icon={primaryIcon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => handleMarkerDrag(e, true)
              }}
            />
            <Polyline
              positions={[
                [currentCoords.lat, currentCoords.lng],
                [currentCoords.lat2, currentCoords.lng2]
              ]}
              color={lineColor}
              weight={4}
              opacity={0.8}
            />
          </>
        )}
      </MapContainer>

      {/* Reusable undo/save controls */}
      <div className="mt-2">
        <UndoSaveControls
          hasChanges={hasChanges}
          onUndo={handleUndo}
          onSave={handleSave}
          className="relative top-auto left-auto justify-end"
        />
      </div>
    </div>
  );
}