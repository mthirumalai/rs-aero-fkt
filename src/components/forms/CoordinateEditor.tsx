"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditablePointMap } from "@/components/map/EditablePointMap";
import { parseCoordinate } from "@/lib/coords";

interface Props {
  name: string;
  lat: string;
  lng: string;
  type: "start" | "end" | "turning";
  onLatChange: (lat: string) => void;
  onLngChange: (lng: string) => void;
  disabled?: boolean;
  showMap?: boolean;
  latError?: string;
  lngError?: string;
}

export function CoordinateEditor({
  name,
  lat,
  lng,
  type,
  onLatChange,
  onLngChange,
  disabled = false,
  showMap = true,
  latError,
  lngError
}: Props) {
  // Parse coordinates for map display
  const parsedLat = parseCoordinate(lat);
  const parsedLng = parseCoordinate(lng);

  const handleMapCoordinateChange = (newLat: number, newLng: number) => {
    onLatChange(newLat.toFixed(6));
    onLngChange(newLng.toFixed(6));
  };

  return (
    <div className="space-y-4">
      {/* Coordinate inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor={`${type}-lat`}>Latitude *</Label>
          <Input
            id={`${type}-lat`}
            value={lat}
            onChange={(e) => onLatChange(e.target.value)}
            disabled={disabled}
            placeholder="50.5155  or  50° 30.93' N  or  50°30′56″ N"
            className={latError ? "border-destructive" : ""}
          />
          {latError && <p className="text-sm text-destructive">{latError}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${type}-lng`}>Longitude *</Label>
          <Input
            id={`${type}-lng`}
            value={lng}
            onChange={(e) => onLngChange(e.target.value)}
            disabled={disabled}
            placeholder="-2.4579  or  2° 27.5' W  or  2°27′28″ W"
            className={lngError ? "border-destructive" : ""}
          />
          {lngError && <p className="text-sm text-destructive">{lngError}</p>}
        </div>
      </div>

      {/* Interactive map */}
      {showMap && (
        <div className="h-[300px] border rounded-lg overflow-hidden">
          <EditablePointMap
            lat={parsedLat}
            lng={parsedLng}
            name={name}
            type={type}
            onCoordinateChange={handleMapCoordinateChange}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}