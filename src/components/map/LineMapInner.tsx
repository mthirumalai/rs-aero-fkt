"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import { LatLngLiteral } from "leaflet";

interface Props {
  type: "POINT" | "LINE";
  lat: number;
  lng: number;
  lat2?: number;
  lng2?: number;
  onLocationChange: (lat: number, lng: number, lat2?: number, lng2?: number) => void;
}

interface LineDrawingComponentProps {
  type: "POINT" | "LINE";
  lat: number;
  lng: number;
  lat2?: number;
  lng2?: number;
  onLocationChange: (lat: number, lng: number, lat2?: number, lng2?: number) => void;
}

function LineDrawingComponent({ type, lat, lng, lat2, lng2, onLocationChange }: LineDrawingComponentProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempLine, setTempLine] = useState<LatLngLiteral[]>([]);

  useMapEvents({
    click: (e) => {
      if (type === "POINT") {
        // For points, just set the location
        onLocationChange(e.latlng.lat, e.latlng.lng);
      } else if (type === "LINE") {
        if (!isDrawing) {
          // Start drawing a line
          setIsDrawing(true);
          setTempLine([e.latlng]);
          onLocationChange(e.latlng.lat, e.latlng.lng, e.latlng.lat, e.latlng.lng);
        } else {
          // Finish drawing the line
          setIsDrawing(false);
          setTempLine([]);
          onLocationChange(lat, lng, e.latlng.lat, e.latlng.lng);
        }
      }
    },
    mousemove: (e) => {
      if (isDrawing && type === "LINE") {
        // Update the temporary line as user moves mouse
        setTempLine([{ lat, lng }, e.latlng]);
      }
    },
  });

  // Create markers for the endpoints
  const markers = [];
  if (type === "POINT" && lat && lng) {
    markers.push(
      <Marker
        key="point"
        position={[lat, lng]}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            onLocationChange(position.lat, position.lng);
          },
        }}
      />
    );
  } else if (type === "LINE" && lat && lng && lat2 && lng2) {
    markers.push(
      <Marker
        key="start"
        position={[lat, lng]}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            onLocationChange(position.lat, position.lng, lat2, lng2);
          },
        }}
      />
    );
    markers.push(
      <Marker
        key="end"
        position={[lat2, lng2]}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            onLocationChange(lat, lng, position.lat, position.lng);
          },
        }}
      />
    );
  }

  // Create the line
  const lines = [];
  if (type === "LINE" && lat && lng && lat2 && lng2) {
    lines.push(
      <Polyline
        key="line"
        positions={[
          [lat, lng],
          [lat2, lng2],
        ]}
        color="red"
        weight={3}
        opacity={0.8}
      />
    );
  }

  // Show temporary line while drawing
  if (isDrawing && tempLine.length > 0) {
    lines.push(
      <Polyline
        key="temp-line"
        positions={tempLine}
        color="blue"
        weight={2}
        opacity={0.6}
        dashArray="5, 10"
      />
    );
  }

  return (
    <>
      {markers}
      {lines}
    </>
  );
}

export function LineMapInner({ type, lat, lng, lat2, lng2, onLocationChange }: Props) {
  const center: [number, number] = [lat, lng];
  const zoom = 14;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      className="rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LineDrawingComponent
        type={type}
        lat={lat}
        lng={lng}
        lat2={lat2}
        lng2={lng2}
        onLocationChange={onLocationChange}
      />
    </MapContainer>
  );
}