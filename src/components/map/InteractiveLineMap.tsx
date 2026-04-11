"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Create a complete dynamic map component to avoid SSR and hook issues
const InteractiveLineMapInner = dynamic(
  () => import("./InteractiveLineMapInner").then((mod) => mod.InteractiveLineMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted rounded-lg flex items-center justify-center h-[300px]">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    )
  }
);

interface Props {
  type: "POINT" | "LINE";
  lat: number;
  lng: number;
  lat2?: number;
  lng2?: number;
  onLocationChange: (lat: number, lng: number, lat2?: number, lng2?: number) => void;
  className?: string;
}

export function InteractiveLineMap({ type, lat, lng, lat2, lng2, onLocationChange, className }: Props) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className={`bg-muted rounded-lg flex items-center justify-center ${className || "h-[300px]"}`}>
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  if (!lat || !lng) {
    return (
      <div className={`bg-muted rounded-lg flex items-center justify-center ${className || "h-[300px]"}`}>
        <p className="text-muted-foreground">Enter coordinates to view map</p>
      </div>
    );
  }

  return (
    <div className={className || "h-[300px]"}>
      <InteractiveLineMapInner
        type={type}
        lat={lat}
        lng={lng}
        lat2={lat2}
        lng2={lng2}
        onLocationChange={onLocationChange}
      />
    </div>
  );
}