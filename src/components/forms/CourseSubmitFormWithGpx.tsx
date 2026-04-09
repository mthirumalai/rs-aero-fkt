"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRY_NAMES, REGION_LABELS, getRegion } from "@/lib/regions";
import { parseCoordinate } from "@/lib/coords";
import { parseGpxXml } from "@/lib/gpx/parser";
import type { GpxPoint } from "@/lib/gpx/parser";
import { parseVelocitkCsv } from "@/lib/velocitek/parser";
import { parseVccXml } from "@/lib/velocitek/vcc-parser";
import CourseCreationMap from "@/components/map/CourseCreationMap";
import { CoordinateEditor } from "./CoordinateEditor";

type SubmissionMode = "manual" | "track_file" | "out_and_back";

const RIG_SIZES = [
  { value: "AERO_5", label: "Aero 5" },
  { value: "AERO_6", label: "Aero 6" },
  { value: "AERO_7", label: "Aero 7" },
  { value: "AERO_9", label: "Aero 9" },
];


export function CourseSubmitFormWithGpx() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<SubmissionMode>("manual");
  const [submitFkt, setSubmitFkt] = useState(false);
  const [extractedDate, setExtractedDate] = useState<Date | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  // Route form data
  const [form, setForm] = useState({
    name: "",
    description: "",
    country: "US",
    startName: "",
    startLat: "",
    startLng: "",
    finishName: "",
    finishLat: "",
    finishLng: "",
    turningMarkName: "",
    turningMarkLat: "",
    turningMarkLng: "",
  });

  // FKT form data
  const [fktForm, setFktForm] = useState({
    rigSize: "",
    windSpeedKnots: "",
    windDirection: "",
    currentNotes: "",
    writeUp: "",
    trackSourceUrl: "",
    sailorName: "",
    sailorEmail: "",
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

  function updateFkt(field: keyof typeof fktForm, value: string) {
    setFktForm((f) => ({ ...f, [field]: value }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      setPhotoFiles(Array.from(files));
    }
  }

  function removePhoto(index: number) {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
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

  async function extractDateFromFile(file: File): Promise<Date | null> {
    try {
      const text = await file.text();
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      let startTime: Date | null = null;

      if (fileExtension === 'gpx') {
        const parsed = parseGpxXml(text);
        startTime = parsed.startTime;
      } else if (fileExtension === 'vcc') {
        const parsed = parseVccXml(text);
        startTime = parsed.startTime || null;
      } else if (fileExtension === 'csv') {
        const parsed = parseVelocitkCsv(text);
        const firstTimedPoint = parsed.points.find(p => p.time !== null);
        startTime = firstTimedPoint?.time || null;
      }

      return startTime;
    } catch (error) {
      console.error('Failed to extract date from track file:', error);
      return null;
    }
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

      // Extract date for FKT submission if needed
      const date = await extractDateFromFile(file);
      setExtractedDate(date);

      // Auto-set initial start and finish points (first and last points)
      const startIndex = 0;
      const finishIndex = points.length - 1;
      setSelectedStartIndex(startIndex);
      setSelectedEndIndex(finishIndex);

      // Auto-populate form fields with initial points
      const startPoint = points[startIndex];
      const finishPoint = points[finishIndex];
      setForm(f => ({
        ...f,
        startLat: startPoint.lat.toFixed(6),
        startLng: startPoint.lon.toFixed(6),
        finishLat: finishPoint.lat.toFixed(6),
        finishLng: finishPoint.lon.toFixed(6),
      }));

      setError(null);
    } catch (err) {
      setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}. Please ensure it's a valid GPX or Velocitek file (.csv/.vcc).`);
      setTrackPoints([]);
      setTrackFile(null);
      setExtractedDate(null);
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
        finishLat: point.lat.toFixed(6),
        finishLng: point.lon.toFixed(6),
      }));
    }
    setSelectionMode(null);
  }

  function switchMode(newMode: SubmissionMode) {
    setMode(newMode);
    setError(null);

    if (newMode === "manual") {
      // Clear track-related state when switching to manual mode
      setTrackPoints([]);
      setSelectedStartIndex(null);
      setSelectedEndIndex(null);
      setSelectionMode(null);
      setTrackFile(null);
      setExtractedDate(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Clear turning mark fields
      setForm(f => ({
        ...f,
        turningMarkName: "",
        turningMarkLat: "",
        turningMarkLng: "",
      }));
    } else if (newMode === "out_and_back") {
      // Clear track-related state when switching to out-and-back mode
      setTrackPoints([]);
      setSelectedStartIndex(null);
      setSelectedEndIndex(null);
      setSelectionMode(null);
      setTrackFile(null);
      setExtractedDate(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // For out-and-back, copy start coordinates to finish coordinates
      if (form.startLat && form.startLng) {
        setForm(f => ({
          ...f,
          finishLat: f.startLat,
          finishLng: f.startLng,
        }));
      }
    } else {
      // Clear manual coordinates when switching to track file mode
      setForm(f => ({
        ...f,
        startLat: "",
        startLng: "",
        finishLat: "",
        finishLng: "",
        turningMarkName: "",
        turningMarkLat: "",
        turningMarkLng: "",
      }));
    }
  }

  async function uploadPhotoFile(file: File): Promise<string> {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "photo",
        filename: file.name,
        contentType: file.type,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(`Photo upload preparation failed: ${data.error ?? "Unknown error"}`);
    }

    const { uploadUrl, key } = await res.json();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!uploadRes.ok) {
      throw new Error(`Photo upload to storage failed`);
    }

    return key;
  }

  async function uploadTrackFile(file: File): Promise<string> {
    // Determine content type based on file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    if (fileExtension === 'gpx') {
      contentType = "application/gpx+xml";
    } else if (fileExtension === 'csv') {
      contentType = "text/csv";
    } else if (fileExtension === 'vcc') {
      contentType = "application/xml";
    }

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "gpx",
        filename: file.name,
        contentType: contentType,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(`Upload preparation failed: ${data.error ?? "Unknown error"}`);
    }

    const { uploadUrl, key } = await res.json();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": contentType },
    });

    if (!uploadRes.ok) {
      throw new Error(`File upload to storage failed`);
    }

    return key;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCoordErrors({});

    // Validation for FKT submission
    if (submitFkt) {
      if (mode === "manual") {
        setError("FKT submission requires a track file. Please switch to 'Upload Track File' mode.");
        return;
      }
      if (mode === "out_and_back") {
        setError("FKT submission requires a track file. Please submit the route first and then add FKT attempts from the course detail page.");
        return;
      }
      if (!trackFile) {
        setError("Please select a track file for FKT submission.");
        return;
      }
      if (!extractedDate) {
        setError("Could not extract date from track file. Please ensure your track file contains timestamps.");
        return;
      }
      if (!fktForm.rigSize) {
        setError("Please select a rig size for your FKT attempt.");
        return;
      }
      if (!fktForm.sailorName) {
        setError("Please enter the sailor's name for the FKT attempt.");
        return;
      }
      if (!fktForm.sailorEmail) {
        setError("Please enter the sailor's email for the FKT attempt.");
        return;
      }
    }

    let startLat, startLng, finishLat, finishLng, turningMarkLat, turningMarkLng;

    if (mode === "manual") {
      startLat = validateCoord("startLat", form.startLat, "lat");
      startLng = validateCoord("startLng", form.startLng, "lng");
      finishLat = validateCoord("finishLat", form.finishLat, "lat");
      finishLng = validateCoord("finishLng", form.finishLng, "lng");

      if (startLat === null || startLng === null || finishLat === null || finishLng === null) return;
    } else if (mode === "out_and_back") {
      startLat = validateCoord("startLat", form.startLat, "lat");
      startLng = validateCoord("startLng", form.startLng, "lng");
      turningMarkLat = validateCoord("turningMarkLat", form.turningMarkLat, "lat");
      turningMarkLng = validateCoord("turningMarkLng", form.turningMarkLng, "lng");

      if (startLat === null || startLng === null || turningMarkLat === null || turningMarkLng === null) return;

      // For out-and-back routes, finish point is the same as start point
      finishLat = startLat;
      finishLng = startLng;
    } else {
      // GPX mode - points should be auto-selected, but validate just in case
      if (selectedStartIndex === null || selectedEndIndex === null) {
        setError("Start and finish points are required. Please reload your GPX file or select points manually.");
        return;
      }

      const startPoint = trackPoints[selectedStartIndex];
      const finishPoint = trackPoints[selectedEndIndex];
      startLat = startPoint.lat;
      startLng = startPoint.lon;
      finishLat = finishPoint.lat;
      finishLng = finishPoint.lon;
    }

    setLoading(true);
    try {
      // Step 1: Submit route
      const courseData = {
        name: form.name,
        description: form.description,
        country: form.country,
        startName: form.startName,
        finishName: "", // Will be set below
        startLat,
        startLng,
        finishLat,
        finishLng,
        courseType: mode === "out_and_back" ? "OUT_AND_BACK" : "POINT_TO_POINT",
        turningMarkName: undefined as string | undefined,
        turningMarkLat: undefined as number | undefined,
        turningMarkLng: undefined as number | undefined,
      };

      // For out-and-back routes, ensure finish name matches start name and add turning mark coordinates
      if (mode === "out_and_back") {
        courseData.finishName = form.startName;
        courseData.turningMarkName = form.turningMarkName;
        if (turningMarkLat !== undefined && turningMarkLng !== undefined) {
          courseData.turningMarkLat = turningMarkLat;
          courseData.turningMarkLng = turningMarkLng;
        }
      } else {
        courseData.finishName = form.finishName;
      }

      const courseRes = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData),
      });

      if (!courseRes.ok) {
        const data = await courseRes.json();
        setError(data.error ?? "Route submission failed");
        return;
      }

      const course = await courseRes.json();

      // Step 2: Submit FKT if enabled
      if (submitFkt && trackFile && extractedDate) {
        try {
          // Upload track file
          const gpxS3Key = await uploadTrackFile(trackFile);

          // Submit FKT attempt
          const fktData = {
            courseId: course.id,
            ...fktForm,
            date: extractedDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
            gpxS3Key,
            windSpeedKnots: fktForm.windSpeedKnots || null,
          };

          const fktRes = await fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fktData),
          });

          if (!fktRes.ok) {
            const fktData = await fktRes.json();
            // Route was submitted successfully, but FKT failed
            setError(`Route submitted successfully, but FKT submission failed: ${fktData.error ?? "Unknown error"}. You can submit your FKT attempt later from the route page after it's approved.`);
            return;
          }

          const fktAttempt = await fktRes.json();

          // Upload photos if any
          if (photoFiles.length > 0) {
            try {
              for (const photoFile of photoFiles) {
                const s3Key = await uploadPhotoFile(photoFile);

                // Create photo record
                await fetch("/api/photos", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    attemptId: fktAttempt.id,
                    s3Key,
                    caption: null,
                  }),
                });
              }
            } catch (photoError) {
              console.error('Photo upload failed:', photoError);
              // Don't fail the whole submission for photo errors
            }
          }
        } catch (fktError) {
          // Route was submitted successfully, but FKT failed
          setError(`Route submitted successfully, but FKT submission failed: ${fktError instanceof Error ? fktError.message : "Unknown error"}. You can submit your FKT attempt later from the route page after it's approved.`);
          return;
        }
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const heading = (
    <h1 className="text-3xl font-bold mb-8">Submit a Course</h1>
  );

  if (success) {
    return (
      <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
        <p className="text-2xl font-bold text-green-800 mb-2">
          {submitFkt ? "Route & FKT Submitted!" : "Route Submitted!"}
        </p>
        <p className="text-green-700 mb-2">
          Your route has been submitted for admin review. You&apos;ll see it appear on the
          routes page once approved.
        </p>
        {submitFkt && (
          <p className="text-green-700">
            Your FKT attempt has also been submitted and will become active when the route is approved.
          </p>
        )}
        <Button className="mt-6" variant="outline" onClick={() => router.push("/courses")}>
          Back to Courses
        </Button>
      </div>
    );
  }

  const sortedCountries = Object.entries(COUNTRY_NAMES).sort(([, a], [, b]) =>
    a.localeCompare(b)
  );


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
            📍 Point to Point
          </button>
          <button
            type="button"
            onClick={() => switchMode("track_file")}
            className={`px-4 py-2 text-sm font-medium border-b-2 border-t border-l-0 border-r-0 transition-colors ${
              mode === "track_file"
                ? "border-primary border-t-border text-primary bg-background"
                : "border-transparent border-t-transparent text-muted-foreground hover:text-foreground hover:border-border hover:border-t-border"
            }`}
          >
            📂 Upload Track File
          </button>
          <button
            type="button"
            onClick={() => switchMode("out_and_back")}
            className={`px-4 py-2 text-sm font-medium border-b-2 border-r border-t border-l-0 rounded-tr-md transition-colors ${
              mode === "out_and_back"
                ? "border-primary border-t-border border-r-border text-primary bg-background"
                : "border-transparent border-t-transparent border-r-transparent text-muted-foreground hover:text-foreground hover:border-border hover:border-t-border hover:border-r-border"
            }`}
          >
            🔄 Out and Back
          </button>
        </div>
        {mode === "track_file" && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              📁 Upload your GPX or Velocitek file (.csv/.vcc) below. Start and finish points will be set automatically to the first and last track points.
              Use the buttons above the map to adjust them if needed.
            </p>
          </div>
        )}
        {mode === "out_and_back" && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              🔄 Create an out-and-back course by specifying a start/finish point and a turning mark.
              The start and finish coordinates should be the same location where the route begins and ends.
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
                    {selectionMode === "end" ? "Cancel" : "Select Finish Point"}
                  </button>
                </div>

                <div className="relative h-96 border rounded-lg overflow-hidden">
                  <CourseCreationMap
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
                    <span className="text-red-600 ml-2">• Finish point: #{selectedEndIndex + 1}</span>
                  )}
                  {selectedStartIndex !== null && selectedEndIndex !== null && (
                    <span className="text-blue-600 ml-2">• Ready to submit!</span>
                  )}
                </div>

                {/* FKT Submission Option */}
                <div className="mt-6 border rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      id="submitFkt"
                      type="checkbox"
                      checked={submitFkt}
                      onChange={(e) => setSubmitFkt(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="submitFkt" className="font-semibold text-sm text-muted-foreground cursor-pointer">
                      🏆 Also submit FKT attempt for this route
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The FKT will be pending until the route is approved.
                  </p>

                  {submitFkt && (
                    <>
                      {extractedDate && (
                        <div className="space-y-2">
                          <Label>Date of Attempt</Label>
                          <div className="px-3 py-2 border rounded-md bg-muted text-sm">
                            <span className="text-muted-foreground">Extracted from track: </span>
                            <span className="font-medium">
                              {extractedDate.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="border-t pt-4 space-y-4">
                        {/* Sailor Details */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm text-foreground">Sailor Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="fktSailorName">Sailor Name *</Label>
                              <Input
                                id="fktSailorName"
                                value={fktForm.sailorName}
                                onChange={(e) => updateFkt("sailorName", e.target.value)}
                                placeholder="Full name of the sailor"
                                required={submitFkt}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="fktSailorEmail">Sailor Email *</Label>
                              <Input
                                id="fktSailorEmail"
                                type="email"
                                value={fktForm.sailorEmail}
                                onChange={(e) => updateFkt("sailorEmail", e.target.value)}
                                placeholder="Email address"
                                required={submitFkt}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Rig Size */}
                        <div className="space-y-2">
                          <Label htmlFor="fktRigSize">Rig Size *</Label>
                          <select
                            id="fktRigSize"
                            value={fktForm.rigSize}
                            onChange={(e) => updateFkt("rigSize", e.target.value)}
                            required={submitFkt}
                            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Select rig size...</option>
                            {RIG_SIZES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Conditions */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm text-foreground">Conditions (Optional)</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="fktWindSpeed">Wind Speed (knots)</Label>
                              <Input
                                id="fktWindSpeed"
                                type="number"
                                min="0"
                                step="0.1"
                                value={fktForm.windSpeedKnots}
                                onChange={(e) => updateFkt("windSpeedKnots", e.target.value)}
                                placeholder="e.g., 15"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="fktWindDirection">Wind Direction</Label>
                              <Input
                                id="fktWindDirection"
                                value={fktForm.windDirection}
                                onChange={(e) => updateFkt("windDirection", e.target.value)}
                                placeholder="e.g., SW, 225°"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="fktCurrentNotes">Current / Tidal Conditions</Label>
                            <Input
                              id="fktCurrentNotes"
                              value={fktForm.currentNotes}
                              onChange={(e) => updateFkt("currentNotes", e.target.value)}
                              placeholder="e.g., 1.5kt favourable tide"
                            />
                          </div>
                        </div>

                        {/* Write-up */}
                        <div className="space-y-2">
                          <Label htmlFor="fktWriteUp">Write-up (Optional)</Label>
                          <Textarea
                            id="fktWriteUp"
                            value={fktForm.writeUp}
                            onChange={(e) => updateFkt("writeUp", e.target.value)}
                            placeholder="Describe your attempt, conditions, tactics..."
                            rows={4}
                          />
                        </div>

                        {/* Track Source URL */}
                        <div className="space-y-2">
                          <Label htmlFor="fktTrackSourceUrl">Track Source URL (Optional)</Label>
                          <Input
                            id="fktTrackSourceUrl"
                            type="url"
                            value={fktForm.trackSourceUrl}
                            onChange={(e) => updateFkt("trackSourceUrl", e.target.value)}
                            placeholder="e.g. https://www.chartedsails.com/session/..."
                          />
                          <p className="text-xs text-muted-foreground">
                            Link to your track on Charted Sails, Strava, or similar.
                          </p>
                        </div>

                        {/* Photos */}
                        <div className="space-y-2">
                          <Label htmlFor="fktPhotos">Photos (Optional)</Label>
                          <Input
                            id="fktPhotos"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoChange}
                          />
                          <p className="text-xs text-muted-foreground">
                            Upload photos from your attempt (max 10MB per photo).
                          </p>
                          {photoFiles.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm text-muted-foreground mb-2">
                                {photoFiles.length} photo{photoFiles.length !== 1 ? 's' : ''} selected:
                              </p>
                              <div className="space-y-2">
                                {photoFiles.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between bg-muted rounded-md p-2">
                                    <span className="text-sm truncate flex-1">{file.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => removePhoto(index)}
                                      className="text-red-600 hover:text-red-800 text-sm ml-2"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
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
            {mode === "out_and_back" ? "Start / Finish Point" : "Start Point"}
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
          <CoordinateEditor
            name={form.startName}
            lat={form.startLat}
            lng={form.startLng}
            type="start"
            onLatChange={(lat) => update("startLat", lat)}
            onLngChange={(lng) => update("startLng", lng)}
            disabled={mode === "track_file"}
            showMap={mode !== "track_file"}
            latError={coordErrors.startLat}
            lngError={coordErrors.startLng}
          />
        </div>

        {/* Finish Point */}
        {mode !== "out_and_back" && (
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Finish Point
            </h3>
            <div className="space-y-2">
              <Label htmlFor="finishName">Name *</Label>
              <Input
                id="finishName"
                value={form.finishName}
                onChange={(e) => update("finishName", e.target.value)}
                placeholder="e.g., Weymouth Harbour Entrance"
                required
              />
            </div>
            <CoordinateEditor
              name={form.finishName}
              lat={form.finishLat}
              lng={form.finishLng}
              type="end"
              onLatChange={(lat) => update("finishLat", lat)}
              onLngChange={(lng) => update("finishLng", lng)}
              disabled={mode === "track_file"}
              showMap={mode !== "track_file"}
              latError={coordErrors.finishLat}
              lngError={coordErrors.finishLng}
            />
          </div>
        )}

        {/* Turning Mark (for out-and-back only) */}
        {mode === "out_and_back" && (
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Turning Mark
            </h3>
            <div className="space-y-2">
              <Label htmlFor="turningMarkName">Name *</Label>
              <Input
                id="turningMarkName"
                value={form.turningMarkName}
                onChange={(e) => update("turningMarkName", e.target.value)}
                placeholder="e.g., Shambles Bank Buoy"
                required
              />
            </div>
            <CoordinateEditor
              name={form.turningMarkName}
              lat={form.turningMarkLat}
              lng={form.turningMarkLng}
              type="turning"
              onLatChange={(lat) => update("turningMarkLat", lat)}
              onLngChange={(lng) => update("turningMarkLng", lng)}
              disabled={false}
              showMap={true}
              latError={coordErrors.turningMarkLat}
              lngError={coordErrors.turningMarkLng}
            />
          </div>
        )}

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
          {loading
            ? "Submitting..."
            : submitFkt
              ? "Submit Route & FKT for Approval"
              : "Submit Route for Approval"
          }
        </Button>
      </form>
    </>
  );
}