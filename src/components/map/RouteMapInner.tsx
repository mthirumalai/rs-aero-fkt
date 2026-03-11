"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

function FitBounds({ startLat, startLng, endLat, endLng }: {
  startLat: number; startLng: number; endLat: number; endLng: number;
}) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(
      [startLat, startLng],
      [endLat, endLng]
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, startLat, startLng, endLat, endLng]);
  return null;
}

interface Props {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  startName: string;
  endName: string;
}

export default function RouteMapInner({ startLat, startLng, endLat, endLng, startName, endName }: Props) {
  const centerLat = (startLat + endLat) / 2;
  const centerLng = (startLng + endLng) / 2;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={10}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds startLat={startLat} startLng={startLng} endLat={endLat} endLng={endLng} />
      <Marker position={[startLat, startLng]} icon={startIcon}>
        <Popup><strong>Start:</strong> {startName}</Popup>
      </Marker>
      <Marker position={[endLat, endLng]} icon={endIcon}>
        <Popup><strong>End:</strong> {endName}</Popup>
      </Marker>
    </MapContainer>
  );
}
