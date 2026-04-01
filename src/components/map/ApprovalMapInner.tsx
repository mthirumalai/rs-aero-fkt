"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
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

function FitBounds({ startLat, startLng, finishLat, finishLng }: {
  startLat: number; startLng: number; finishLat: number; finishLng: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(L.latLngBounds([startLat, startLng], [finishLat, finishLng]), { padding: [60, 60] });
  }, [map, startLat, startLng, finishLat, finishLng]);
  return null;
}

interface Props {
  startLat: number; startLng: number; finishLat: number; finishLng: number;
  startName: string; finishName: string;
}

export default function ApprovalMapInner({ startLat, startLng, finishLat, finishLng, startName, finishName }: Props) {
  const [marine, setMarine] = useState(true); // Default to Marine
  const center: [number, number] = [(startLat + finishLat) / 2, (startLng + finishLng) / 2];
  const line: [number, number][] = [[startLat, startLng], [finishLat, finishLng]];

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

      <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }}>
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

        <FitBounds startLat={startLat} startLng={startLng} finishLat={finishLat} finishLng={finishLng} />

        {/* Straight line between start and finish points */}
        <Polyline positions={line} color="#ec008c" weight={2} dashArray="6 4" opacity={0.8} />

        <Marker position={[startLat, startLng]} icon={startIcon}>
          <Popup><strong>Start:</strong> {startName}<br />{startLat.toFixed(6)}, {startLng.toFixed(6)}</Popup>
        </Marker>
        <Marker position={[finishLat, finishLng]} icon={endIcon}>
          <Popup><strong>Finish:</strong> {finishName}<br />{finishLat.toFixed(6)}, {finishLng.toFixed(6)}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
