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
import { parseVelocitkCsv } from "@/lib/velocitek/parser";
import { parseVccXml } from "@/lib/velocitek/vcc-parser";
import RouteCreationMap from "@/components/map/RouteCreationMap";

type SubmissionMode = "manual" | "track_file";


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

  // Track file-related state
  const [trackPoints, setTrackPoints] = useState<GpxPoint[]>([]);
  const [selectedStartIndex, setSelectedStartIndex] = useState<number | null>(null);
  const [selectedEndIndex, setSelectedEndIndex] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState<"start" | "end" | null>(null);
  const [trackFile, setTrackFile] = useState<File | null>(null);


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
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      let points: GpxPoint[] = [];

      if (fileExtension === 'gpx') {
        const parsed = parseGpxXml(text);
        points = parsed.points;

        if (points.length === 0) {
          setError("GPX file contains no track points");
          return;
        }
      } else if (fileExtension === 'csv') {
        const parsed = parseVelocitkCsv(text);
        points = parsed.points;

        if (parsed.errors.length > 0) {
          setError(`CSV parsing errors: ${parsed.errors.join(', ')}`);
          return;
        }

        if (points.length === 0) {
          setError("CSV file contains no valid track points");
          return;
        }
      } else if (fileExtension === 'vcc') {
        const parsed = parseVccXml(text);
        points = parsed.points;

        if (parsed.errors.length > 0) {
          setError(`VCC parsing errors: ${parsed.errors.join(', ')}`);
          return;
        }

        if (points.length === 0) {
          setError("VCC file contains no valid track points");
          return;
        }
      } else {
        setError("Please upload a .gpx, .csv, or .vcc file");
        return;
      }

      setTrackFile(file); // Store the file for potential FKT submission
      setTrackPoints(points);

      // Auto-set initial start and end points (first and last points)
      const startIndex = 0;
      const endIndex = points.length - 1;
      setSelectedStartIndex(startIndex);
      setSelectedEndIndex(endIndex);

      // Auto-populate form fields with initial points
      const startPoint = points[startIndex];
      const endPoint = points[endIndex];
      setForm(f => ({
        ...f,
        startLat: startPoint.lat.toFixed(6),
        startLng: startPoint.lon.toFixed(6),
        endLat: endPoint.lat.toFixed(6),
        endLng: endPoint.lon.toFixed(6),
      }));

      setError(null);
    } catch (err) {
      setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}. Please ensure it's a valid GPX or Velocitek file (.csv/.vcc).`);
      setTrackPoints([]);
      setTrackFile(null);
    }
  }

  function handlePointSelect(index: number, type: "start" | "end") {
    const point = trackPoints[index];
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
      setTrackPoints([]);
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

      const startPoint = trackPoints[selectedStartIndex];
      const endPoint = trackPoints[selectedEndIndex];
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

      {/* Mode Selection - Tabs */}
      <div className="mb-6">
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => switchMode("manual")}
            className={`px-4 py-2 text-sm font-medium border-b-2 border-l border-t border-r-0 rounded-tl-md transition-colors ${
              mode === "manual"
                ? "border-primary border-t-border border-l-border text-primary bg-background"
                : "border-transparent border-t-transparent border-l-transparent text-muted-foreground hover:text-foreground hover:border-border hover:border-t-border hover:border-l-border"
            }`}
          >
            📍 Manual Entry
          </button>
          <button
            type="button"
            onClick={() => switchMode("track_file")}
            className={`px-4 py-2 text-sm font-medium border-b-2 border-r border-t border-l-0 rounded-tr-md transition-colors ${
              mode === "track_file"
                ? "border-primary border-t-border border-r-border text-primary bg-background"
                : "border-transparent border-t-transparent border-r-transparent text-muted-foreground hover:text-foreground hover:border-border hover:border-t-border hover:border-r-border"
            }`}
          >
            📂 Upload Track File
          </button>
        </div>
        {mode === "track_file" && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              📁 Upload your GPX or Velocitek file (.csv/.vcc) below. Start and end points will be set automatically to the first and last track points.
              Use the buttons above the map to adjust them if needed.
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
        {mode === "track_file" && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gpx-file">Upload GPX or Velocitek File (.csv/.vcc) *</Label>
              <div className="flex gap-2">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  id="gpx-file"
                  type="file"
                  accept=".gpx,.csv,.vcc"
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
                  📁 Choose Track File
                </Button>
                {/* Visible filename display */}
                <div className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background">
                  {trackFile ? (
                    <span className="text-foreground">{trackFile.name}</span>
                  ) : (
                    <span className="text-muted-foreground">No file selected</span>
                  )}
                </div>
              </div>
            </div>

            {trackPoints.length > 0 && (
              <>
                {selectionMode && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-700">
                      👆 <strong>Selection mode active!</strong> Click on a gray dot on the track to set your{" "}
                      <strong>{selectionMode} point</strong>. Look for the small gray circles along the blue track line.
                    </p>
                  </div>
                )}

                {/* Point selection buttons - above the map */}
                <div className="flex justify-center gap-3 mb-4">
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

                <div className="relative h-96 border rounded-lg overflow-hidden">
                  <RouteCreationMap
                    points={trackPoints}
                    selectedStartIndex={selectedStartIndex}
                    selectedEndIndex={selectedEndIndex}
                    onPointSelect={handlePointSelect}
                    selectionMode={selectionMode}
                  />
                </div>

                <div className="text-sm text-muted-foreground">
                  Track loaded: {trackPoints.length} points
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
            <CoordField id="startLat" label="Latitude" value={form.startLat} type="lat" disabled={mode === "track_file"} />
            <CoordField id="startLng" label="Longitude" value={form.startLng} type="lng" disabled={mode === "track_file"} />
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
            <CoordField id="endLat" label="Latitude" value={form.endLat} type="lat" disabled={mode === "track_file"} />
            <CoordField id="endLng" label="Longitude" value={form.endLng} type="lng" disabled={mode === "track_file"} />
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