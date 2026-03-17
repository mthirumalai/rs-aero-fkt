"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseGpxXml } from "@/lib/gpx/parser";
import { parseVccXml } from "@/lib/velocitek/vcc-parser";
import { parseVelocitkCsv } from "@/lib/velocitek/parser";

interface Props {
  routeId: string;
  submitterName: string;
  submitterEmail: string;
}

const RIG_SIZES = [
  { value: "AERO_5", label: "Aero 5" },
  { value: "AERO_6", label: "Aero 6" },
  { value: "AERO_7", label: "Aero 7" },
  { value: "AERO_9", label: "Aero 9" },
];

export function FktSubmitForm({ routeId, submitterName, submitterEmail }: Props) {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [form, setForm] = useState({
    rigSize: "",
    windSpeedKnots: "",
    windDirection: "",
    currentNotes: "",
    writeUp: "",
    trackSourceUrl: "",
    sailorName: submitterName,
    sailorEmail: submitterEmail,
  });
  const [trackFile, setTrackFile] = useState<File | null>(null);
  const [extractedDate, setExtractedDate] = useState<Date | null>(null);

  // Scroll to error message when error appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [error]);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
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
        // Get the first point with a timestamp
        const firstTimedPoint = parsed.points.find(p => p.time !== null);
        startTime = firstTimedPoint?.time || null;
      } else if (fileExtension === 'csv') {
        const parsed = parseVelocitkCsv(text);
        // Get the first point with a timestamp
        const firstTimedPoint = parsed.points.find(p => p.time !== null);
        startTime = firstTimedPoint?.time || null;
      }

      return startTime;
    } catch (error) {
      console.warn('Failed to extract date from track file:', error);
      return null;
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setTrackFile(file);

    if (file) {
      // Extract date from the track file
      const date = await extractDateFromFile(file);
      setExtractedDate(date);
    } else {
      setExtractedDate(null);
    }
  }

  async function uploadTrackFile(file: File): Promise<string> {
    setUploadProgress("Getting upload URL...");

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
        type: "gpx", // Keep as "gpx" for S3 bucket compatibility
        filename: file.name,
        contentType: contentType,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to prepare track file upload. Please check your file and try again.");
    }

    const { uploadUrl, key } = await res.json();

    setUploadProgress("Uploading track file...");
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": contentType },
    });

    if (!uploadRes.ok) {
      throw new Error("Failed to upload track file. Please check your internet connection and try again.");
    }

    return key;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackFile) {
      setError("Please select a track file (GPX, CSV, or VCC)");
      return;
    }

    if (!extractedDate) {
      setError("Could not extract date from track file. Please ensure your track file contains timestamps.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Upload track file to S3
      const gpxS3Key = await uploadTrackFile(trackFile);

      // Step 2: Submit attempt metadata
      setUploadProgress("Validating track...");
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId,
          ...form,
          date: extractedDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
          gpxS3Key,
          windSpeedKnots: form.windSpeedKnots || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        let errMsg = data.error ?? "Submission failed";

        // Add helpful context for validation errors
        if (res.status === 422 && (data.nearestStartDistanceM !== undefined || data.nearestEndDistanceM !== undefined)) {
          // The error message should already contain distance info from the enhanced API
          // But add extra context for users
          errMsg += " Please check that your track starts and ends at the correct locations. Use a GPS device or app that records your complete track including starts and finishes.";
        } else if (res.status === 500) {
          errMsg = "Server error: " + errMsg;
        } else if (res.status === 404) {
          errMsg = "Route error: " + errMsg;
        }

        setError(errMsg);
        return;
      }

      const attempt = await res.json();
      setSuccess(true);
      setTimeout(() => router.push(`/attempts/${attempt.id}`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  }

  if (success) {
    return (
      <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
        <p className="text-2xl font-bold text-green-800 mb-2">FKT Submitted!</p>
        <p className="text-green-700">
          Your GPX track has been validated. Redirecting to your attempt page...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div ref={errorRef} className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      {uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
          {uploadProgress}
        </div>
      )}

      {/* Sailor Details */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Sailor Details
        </h3>
        <p className="text-sm text-muted-foreground">
          Who sailed this attempt? This may be different from the person submitting.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sailorName">Sailor Name *</Label>
            <Input
              id="sailorName"
              value={form.sailorName}
              onChange={(e) => update("sailorName", e.target.value)}
              placeholder="Full name of the sailor"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sailorEmail">Sailor Email *</Label>
            <Input
              id="sailorEmail"
              type="email"
              value={form.sailorEmail}
              onChange={(e) => update("sailorEmail", e.target.value)}
              placeholder="Email address"
              required
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rigSize">Rig Size *</Label>
        <select
          id="rigSize"
          value={form.rigSize}
          onChange={(e) => update("rigSize", e.target.value)}
          required
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

      <div className="space-y-2">
        <Label htmlFor="gpx">
          Track File *{" "}
          <span className="text-xs text-muted-foreground">(GPX, CSV, or VCC, max 10MB)</span>
        </Label>
        <Input
          id="gpx"
          type="file"
          accept=".gpx,.csv,.vcc,application/gpx+xml"
          onChange={handleFileChange}
          required
        />
        <p className="text-xs text-muted-foreground">
          Your track must pass within 10m of both the route start and end points. Date will be automatically extracted from the file.
        </p>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Conditions (Optional)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="windSpeedKnots">Wind Speed (knots)</Label>
            <Input
              id="windSpeedKnots"
              type="number"
              min="0"
              step="0.1"
              value={form.windSpeedKnots}
              onChange={(e) => update("windSpeedKnots", e.target.value)}
              placeholder="e.g., 15"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="windDirection">Wind Direction</Label>
            <Input
              id="windDirection"
              value={form.windDirection}
              onChange={(e) => update("windDirection", e.target.value)}
              placeholder="e.g., SW, 225°"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentNotes">Current / Tidal Conditions</Label>
          <Input
            id="currentNotes"
            value={form.currentNotes}
            onChange={(e) => update("currentNotes", e.target.value)}
            placeholder="e.g., 1.5kt favourable tide"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="writeUp">Write-up <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea
          id="writeUp"
          value={form.writeUp}
          onChange={(e) => update("writeUp", e.target.value)}
          placeholder="Describe your attempt, conditions, tactics..."
          rows={6}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="trackSourceUrl">Track Source URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          id="trackSourceUrl"
          type="url"
          value={form.trackSourceUrl}
          onChange={(e) => update("trackSourceUrl", e.target.value)}
          placeholder="e.g. https://www.chartedsails.com/session/..."
        />
        <p className="text-xs text-muted-foreground">
          Optional. Link to your track on Charted Sails, Strava, or similar. A GPX file upload above is still required for validation.
        </p>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary"
        size="lg"
      >
        {loading ? "Submitting..." : "Submit FKT Attempt"}
      </Button>
    </form>
  );
}
