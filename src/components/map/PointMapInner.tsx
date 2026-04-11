"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface Props {
  lat: number;
  lng: number;
  name: string;
  type: "start" | "end" | "turning";
  pointType?: "POINT" | "LINE";
  lat2?: number;
  lng2?: number;
}

export default function PointMapInner({ lat, lng, name, type, pointType = "POINT", lat2, lng2 }: Props) {
  const [marine, setMarine] = useState(true); // Default to Marine

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

      <MapContainer center={[lat, lng]} zoom={16} style={{ height: "100%", width: "100%" }}>
        {/* Base tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* OpenSeaMap marine overlay - always load but conditionally visible */}
        <TileLayer
          attribution='&copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors'
          url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
          opacity={marine ? 1 : 0}
        />

        <Marker position={[lat, lng]} icon={
          type === "start" ? startIcon :
          type === "end" ? endIcon :
          turningMarkIcon
        }>
          <Popup>
            <strong>{
              type === "start" ? "Start" :
              type === "end" ? "End" :
              "Turning Mark"
            }:</strong> {name}<br />
            {pointType === "LINE" ? "Line Start: " : ""}{lat.toFixed(6)}, {lng.toFixed(6)}
          </Popup>
        </Marker>

        {pointType === "LINE" && lat2 !== undefined && lng2 !== undefined && (
          <>
            <Marker position={[lat2, lng2]} icon={
              type === "start" ? startIcon :
              type === "end" ? endIcon :
              turningMarkIcon
            }>
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
    </div>
  );
}