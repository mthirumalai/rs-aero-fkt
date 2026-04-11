"use client";

import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";

// Fix default marker icons in Next.js (required for Leaflet to work)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Create custom icons for different purposes
const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

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

export default function SimpleInteractiveMapInner({ type, lat, lng, lat2, lng2, purpose, onLocationChange }: Props) {
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
      setHasChanges(
        newCoords.lat !== originalCoords.lat ||
        newCoords.lng !== originalCoords.lng ||
        newCoords.lat2 !== originalCoords.lat2 ||
        newCoords.lng2 !== originalCoords.lng2
      );
    }
  }, [type, currentCoords, originalCoords, lat2, lng2]);

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
  const primaryIcon = purpose === "start" ? greenIcon : redIcon;
  const secondaryIcon = purpose === "start" ? greenIcon : redIcon;
  const lineColor = purpose === "start" ? "green" : "red";

  const center: [number, number] = [currentCoords.lat, currentCoords.lng];

  return (
    <div className="space-y-2">
      <div className="h-[300px] w-full border border-gray-300 rounded-lg overflow-hidden">
        <MapContainer
          center={center}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          className="h-full w-full"
          dragging={true}
          doubleClickZoom={true}
          scrollWheelZoom={true}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Marine Chart">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="http://www.openseamap.org">OpenSeaMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Street Map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.Overlay checked name="Nautical Information">
              <TileLayer
                attribution='&copy; <a href="http://www.openseamap.org">OpenSeaMap</a> contributors'
                url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
                maxZoom={18}
              />
            </LayersControl.Overlay>
          </LayersControl>

          <MapClickHandler type={type} onLocationChange={(lat, lng, lat2, lng2) => {
            const newCoords = { lat, lng, lat2, lng2 };
            setCurrentCoords(newCoords);
            setHasChanges(
              lat !== originalCoords.lat ||
              lng !== originalCoords.lng ||
              lat2 !== originalCoords.lat2 ||
              lng2 !== originalCoords.lng2
            );
          }} />

          {/* Always show the primary marker */}
          <Marker
            position={[currentCoords.lat, currentCoords.lng]}
            icon={primaryIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => handleMarkerDrag(e, false)
            }}
          />

          {/* For LINE type, show second marker and line */}
          {type === "LINE" && currentCoords.lat2 !== undefined && currentCoords.lng2 !== undefined && (
            <>
              <Marker
                position={[currentCoords.lat2, currentCoords.lng2]}
                icon={secondaryIcon}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => handleMarkerDrag(e, true)
                }}
              />
              <Polyline
                positions={[[currentCoords.lat, currentCoords.lng], [currentCoords.lat2, currentCoords.lng2]]}
                color={lineColor}
                weight={3}
                opacity={0.8}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* Undo/Save buttons */}
      {hasChanges && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUndo}
          >
            Undo
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}