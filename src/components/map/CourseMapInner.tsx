"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const startIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const endIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const turningMarkIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function FitBounds({ startLat, startLng, finishLat, finishLng, turningMarkLat, turningMarkLng }: {
  startLat: number; startLng: number; finishLat: number; finishLng: number;
  turningMarkLat?: number; turningMarkLng?: number;
}) {
  const map = useMap();
  useEffect(() => {
    const points = [[startLat, startLng], [finishLat, finishLng]] as [number, number][];
    if (turningMarkLat !== undefined && turningMarkLng !== undefined) {
      points.push([turningMarkLat, turningMarkLng]);
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, startLat, startLng, finishLat, finishLng, turningMarkLat, turningMarkLng]);
  return null;
}

interface Props {
  startLat: number;
  startLng: number;
  finishLat: number;
  finishLng: number;
  startName: string;
  finishName: string;
  turningMarkLat?: number;
  turningMarkLng?: number;
  turningMarkName?: string;
  courseType?: "POINT_TO_POINT" | "OUT_AND_BACK";
}

export default function CourseMapInner({
  startLat,
  startLng,
  finishLat,
  finishLng,
  startName,
  finishName,
  turningMarkLat,
  turningMarkLng,
  turningMarkName,
  courseType
}: Props) {
  const [marine, setMarine] = useState(true);
  const centerLat = (startLat + finishLat) / 2;
  const centerLng = (startLng + finishLng) / 2;

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

      <MapContainer
        center={[centerLat, centerLng]}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
      >
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
      <FitBounds
        startLat={startLat}
        startLng={startLng}
        finishLat={finishLat}
        finishLng={finishLng}
        turningMarkLat={turningMarkLat}
        turningMarkLng={turningMarkLng}
      />
      <Marker position={[startLat, startLng]} icon={startIcon}>
        <Popup>
          <strong>{courseType === "OUT_AND_BACK" ? "Start/Finish:" : "Start:"}</strong> {startName}
        </Popup>
      </Marker>
      {courseType === "OUT_AND_BACK" ? (
        turningMarkLat !== undefined && turningMarkLng !== undefined && turningMarkName && (
          <>
            <Marker position={[turningMarkLat, turningMarkLng]} icon={turningMarkIcon}>
              <Popup><strong>Turning Mark:</strong> {turningMarkName}</Popup>
            </Marker>
            <Polyline
              positions={[[startLat, startLng], [turningMarkLat, turningMarkLng]]}
              color="#3b82f6"
              weight={3}
              opacity={0.7}
            />
          </>
        )
      ) : (
        <>
          <Marker position={[finishLat, finishLng]} icon={endIcon}>
            <Popup><strong>Finish:</strong> {finishName}</Popup>
          </Marker>
          <Polyline
            positions={[[startLat, startLng], [finishLat, finishLng]]}
            color="#3b82f6"
            weight={3}
            opacity={0.7}
          />
        </>
      )}
      </MapContainer>
    </div>
  );
}
