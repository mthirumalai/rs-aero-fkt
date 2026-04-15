"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Simple wrapper for the interactive map to avoid SSR and multiple rendering issues
const MapComponentInner = dynamic(() => import("./EditableLineMapInner"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted rounded-lg flex items-center justify-center h-[300px]">
      <p className="text-muted-foreground">Loading interactive map...</p>
    </div>
  )
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

export function EditableLineMap({ type, lat, lng, lat2, lng2, purpose, onLocationChange }: Props) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="bg-muted rounded-lg flex items-center justify-center h-[300px]">
        <p className="text-muted-foreground">Preparing map...</p>
      </div>
    );
  }

  if (lat === null || lat === undefined || lng === null || lng === undefined || isNaN(lat) || isNaN(lng)) {
    return (
      <div className="bg-muted rounded-lg flex items-center justify-center h-[300px]">
        <p className="text-muted-foreground">Enter valid coordinates to view map</p>
      </div>
    );
  }

  return (
    <MapComponentInner
      type={type}
      lat={lat}
      lng={lng}
      lat2={lat2}
      lng2={lng2}
      purpose={purpose}
      onLocationChange={onLocationChange}
    />
  );
}