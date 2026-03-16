"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRY_NAMES, REGION_LABELS, getRegion } from "@/lib/regions";
import { parseCoordinate, formatCoord } from "@/lib/coords";
import { parseGpxXml } from "@/lib/gpx/parser";
import type { GpxPoint } from "@/lib/gpx/parser";
import RouteCreationMap from "@/components/map/RouteCreationMap";

type SubmissionMode = "manual" | "gpx";


export function RouteSubmitFormWithGpx() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<SubmissionMode>("manual");

  // Form data
  const [form, setForm] = useState({
    name: "",
    description: "",
    country: "US",
    startName: "",
    startLat: "",
    startLng: "",
    endName: "",
    endLat: "",
    endLng: "",
  });

  // GPX-related state
  const [gpxPoints, setGpxPoints] = useState<GpxPoint[]>([]);
  const [selectedStartIndex, setSelectedStartIndex] = useState<number | null>(null);
  const [selectedEndIndex, setSelectedEndIndex] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState<"start" | "end" | null>(null);
  const [gpxFile, setGpxFile] = useState<File | null>(null);


  // Per-field parse errors shown inline
  const [coordErrors, setCoordErrors] = useState<Partial<Record<string, string>>>({});

  const selectedRegion = form.country ? getRegion(form.country) : null;

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    // Clear the inline error as the user types, but only if it exists
    if (coordErrors[field]) {
      setCoordErrors((e) => { const next = { ...e }; delete next[field]; return next; });
    }
  }




  function validateCoord(field: string, raw: string, type: "lat" | "lng"): number | null {
    const val = parseCoordinate(raw);
    if (val === null) {
      setCoordErrors((e) => ({ ...e, [field]: `Could not parse "${raw}". Use decimal (e.g. 50.5155) or DMS (e.g. 50°30'55" N).` }));
      return null;
    }
    if (type === "lat" && (val < -90 || val > 90)) {
      setCoordErrors((e) => ({ ...e, [field]: "Latitude must be between -90 and 90." }));
      return null;
    }
    if (type === "lng" && (val < -180 || val > 180)) {
      setCoordErrors((e) => ({ ...e, [field]: "Longitude must be between -180 and 180." }));
      return null;
    }
    return val;
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseGpxXml(text);

      if (parsed.points.length === 0) {
        setError("GPX file contains no track points");
        return;
      }

      setGpxFile(file); // Store the file for potential FKT submission
      setGpxPoints(parsed.points);

      // Auto-set initial start and end points (first and last points)
      const startIndex = 0;
      const endIndex = parsed.points.length - 1;
      setSelectedStartIndex(startIndex);
      setSelectedEndIndex(endIndex);

      // Auto-populate form fields with initial points
      const startPoint = parsed.points[startIndex];
      const endPoint = parsed.points[endIndex];
      setForm(f => ({
        ...f,
        startLat: startPoint.lat.toFixed(6),
        startLng: startPoint.lon.toFixed(6),
        endLat: endPoint.lat.toFixed(6),
        endLng: endPoint.lon.toFixed(6),
      }));

      setError(null);
    } catch {
      setError("Failed to parse GPX file. Please ensure it's a valid GPX file.");
      setGpxPoints([]);
      setGpxFile(null);
    }
  }

  function handlePointSelect(index: number, type: "start" | "end") {
    const point = gpxPoints[index];
    if (!point) return;

    if (type === "start") {
      setSelectedStartIndex(index);
      setForm(f => ({
        ...f,
        startLat: point.lat.toFixed(6),
        startLng: point.lon.toFixed(6),
      }));
    } else {
      setSelectedEndIndex(index);
      setForm(f => ({
        ...f,
        endLat: point.lat.toFixed(6),
        endLng: point.lon.toFixed(6),
      }));
    }
    setSelectionMode(null);
  }

  function switchMode(newMode: SubmissionMode) {
    setMode(newMode);
    setError(null);
    if (newMode === "manual") {
      setGpxPoints([]);
      setSelectedStartIndex(null);
      setSelectedEndIndex(null);
      setSelectionMode(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } else {
      // Clear manual coordinates when switching to GPX mode
      setForm(f => ({
        ...f,
        startLat: "",
        startLng: "",
        endLat: "",
        endLng: "",
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCoordErrors({});

    let startLat, startLng, endLat, endLng;

    if (mode === "manual") {
      startLat = validateCoord("startLat", form.startLat, "lat");
      startLng = validateCoord("startLng", form.startLng, "lng");
      endLat = validateCoord("endLat", form.endLat, "lat");
      endLng = validateCoord("endLng", form.endLng, "lng");

      if (startLat === null || startLng === null || endLat === null || endLng === null) return;
    } else {
      // GPX mode - points should be auto-selected, but validate just in case
      if (selectedStartIndex === null || selectedEndIndex === null) {
        setError("Start and end points are required. Please reload your GPX file or select points manually.");
        return;
      }

      const startPoint = gpxPoints[selectedStartIndex];
      const endPoint = gpxPoints[selectedEndIndex];
      startLat = startPoint.lat;
      startLng = startPoint.lon;
      endLat = endPoint.lat;
      endLng = endPoint.lon;
    }


    setLoading(true);
    try {
      // Step 1: Submit route
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, startLat, startLng, endLat, endLng }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Route submission failed");
        return;
      }

      await res.json();
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const heading = (
    <h1 className="text-3xl font-bold mb-8">Submit a Route</h1>
  );

  if (success) {
    return (
      <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
        <p className="text-2xl font-bold text-green-800 mb-2">
          Route Submitted!
        </p>
        <p className="text-green-700">
          Your route has been submitted for admin review. You&apos;ll see it appear on the
          routes page once approved.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => router.push("/routes")}>
          Back to Routes
        </Button>
      </div>
    );
  }

  const sortedCountries = Object.entries(COUNTRY_NAMES).sort(([, a], [, b]) =>
    a.localeCompare(b)
  );

  function CoordField({ id, label, value, type, disabled = false }: {
    id: keyof typeof form; label: string; value: string; type: "lat" | "lng"; disabled?: boolean;
  }) {
    const placeholder = type === "lat"
      ? "50.5155  or  50° 30.93' N  or  50°30′56″ N"
      : "-2.4579  or  2° 27.5' W  or  2°27′28″ W";
    return (
      <div className="space-y-1">
        <Label htmlFor={id}>{label} *</Label>
        <Input
          id={id}
          key={id}
          value={value}
          onChange={(e) => update(id, e.target.value)}
          placeholder={disabled ? "Will be set by clicking on the map" : placeholder}
          required
          autoComplete="off"
          disabled={disabled}
          className={disabled ? "bg-muted" : ""}
        />
        {coordErrors[id] ? (
          <p className="text-xs text-destructive">{coordErrors[id]}</p>
        ) : (
          (() => {
            if (!value || disabled) return null;
            const parsed = parseCoordinate(value);
            return parsed !== null ? (
              <p className="text-xs text-muted-foreground">
                → {formatCoord(parsed)}°
              </p>
            ) : null;
          })()
        )}
      </div>
    );
  }

  return (
    <>
      {heading}

      {/* Mode Selection */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <p className="font-semibold mb-3">Choose how to define your route:</p>
        <div className="flex gap-4">
          <Button
            type="button"
            variant={mode === "manual" ? "pressed" : "outline"}
            onClick={() => switchMode("manual")}
          >
            📍 Manual Entry
          </Button>
          <Button
            type="button"
            variant={mode === "gpx" ? "pressed" : "outline"}
            onClick={() => switchMode("gpx")}
          >
            📂 Use GPX Track
          </Button>
        </div>
        {mode === "gpx" && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              📁 Upload your GPX file below. Start and end points will be set automatically to the first and last track points.
              Use the buttons on the map to adjust them if needed.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* GPX Upload Section - moved to top */}
        {mode === "gpx" && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gpx-file">Upload GPX File *</Label>
              <div className="flex gap-2">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  id="gpx-file"
                  type="file"
                  accept=".gpx"
                  onChange={handleFileUpload}
                  required
                  className="hidden"
                />
                {/* File picker button - moved to left */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="whitespace-nowrap"
                >
                  📁 Choose GPX File
                </Button>
                {/* Visible filename display */}
                <div className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background">
                  {gpxFile ? (
                    <span className="text-foreground">{gpxFile.name}</span>
                  ) : (
                    <span className="text-muted-foreground">No file selected</span>
                  )}
                </div>
              </div>
            </div>

            {gpxPoints.length > 0 && (
              <>
                {selectionMode && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-700">
                      👆 <strong>Selection mode active!</strong> Click on a gray dot on the track to set your{" "}
                      <strong>{selectionMode} point</strong>. Look for the small gray circles along the blue track line.
                    </p>
                  </div>
                )}

                <div className="relative h-96 border rounded-lg overflow-hidden">
                  <RouteCreationMap
                    points={gpxPoints}
                    selectedStartIndex={selectedStartIndex}
                    selectedEndIndex={selectedEndIndex}
                    onPointSelect={handlePointSelect}
                    selectionMode={selectionMode}
                  />

                  {/* Overlay buttons in center of map */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="flex gap-3 pointer-events-auto">
                      <button
                        type="button"
                        onClick={() => setSelectionMode(selectionMode === "start" ? null : "start")}
                        className={`px-4 py-2 text-sm font-medium rounded-lg border-2 border-white shadow-lg transition-all duration-200 ${
                          selectionMode === "start"
                            ? "bg-green-600 text-white scale-105"
                            : "bg-green-500 text-white hover:bg-green-600 hover:scale-105"
                        }`}
                        style={{ backgroundColor: selectionMode === "start" ? "#059669" : "#10b981" }}
                      >
                        {selectionMode === "start" ? "Cancel" : "Select Start Point"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectionMode(selectionMode === "end" ? null : "end")}
                        className={`px-4 py-2 text-sm font-medium rounded-lg border-2 border-white shadow-lg transition-all duration-200 ${
                          selectionMode === "end"
                            ? "bg-red-600 text-white scale-105"
                            : "bg-red-500 text-white hover:bg-red-600 hover:scale-105"
                        }`}
                        style={{ backgroundColor: selectionMode === "end" ? "#dc2626" : "#ef4444" }}
                      >
                        {selectionMode === "end" ? "Cancel" : "Select End Point"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Track loaded: {gpxPoints.length} points
                  {selectedStartIndex !== null && (
                    <span className="text-green-600 ml-2">• Start point: #{selectedStartIndex + 1}</span>
                  )}
                  {selectedEndIndex !== null && (
                    <span className="text-red-600 ml-2">• End point: #{selectedEndIndex + 1}</span>
                  )}
                  {selectedStartIndex !== null && selectedEndIndex !== null && (
                    <span className="text-blue-600 ml-2">• Ready to submit!</span>
                  )}
                </div>

                {/* FKT Submission Option - Temporarily disabled */}
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-yellow-800">
                        🏆 Submit FKT Later
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        After your route is approved by an admin, you&apos;ll be able to submit your FKT attempt from the route page.
                        This ensures your GPX track is validated against the approved route coordinates.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Route Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g., Portland Bill to Weymouth"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country *</Label>
          <div className="flex gap-2 items-center">
            <select
              id="country"
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              required
              className="flex-1 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a country...</option>
              {sortedCountries.map(([code, name]) => (
                <option key={code} value={code}>{name} ({code})</option>
              ))}
            </select>
            {selectedRegion && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Region: {REGION_LABELS[selectedRegion]}
              </span>
            )}
          </div>
        </div>


        {/* Start Point */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Start Point
          </h3>
          <div className="space-y-2">
            <Label htmlFor="startName">Name *</Label>
            <Input
              id="startName"
              value={form.startName}
              onChange={(e) => update("startName", e.target.value)}
              placeholder="e.g., Portland Bill Lighthouse"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CoordField id="startLat" label="Latitude" value={form.startLat} type="lat" disabled={mode === "gpx"} />
            <CoordField id="startLng" label="Longitude" value={form.startLng} type="lng" disabled={mode === "gpx"} />
          </div>
        </div>

        {/* End Point */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            End Point
          </h3>
          <div className="space-y-2">
            <Label htmlFor="endName">Name *</Label>
            <Input
              id="endName"
              value={form.endName}
              onChange={(e) => update("endName", e.target.value)}
              placeholder="e.g., Weymouth Harbour Entrance"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CoordField id="endLat" label="Latitude" value={form.endLat} type="lat" disabled={mode === "gpx"} />
            <CoordField id="endLng" label="Longitude" value={form.endLng} type="lng" disabled={mode === "gpx"} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Notes to sailors <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Brief description of the route..."
            rows={3}
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? "Submitting..." : "Submit Route for Approval"}
        </Button>
      </form>
    </>
  );
}