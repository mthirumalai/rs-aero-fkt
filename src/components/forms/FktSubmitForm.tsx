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
  preferredRigSize: string | null;
}

const RIG_SIZES = [
  { value: "AERO_5", label: "Aero 5" },
  { value: "AERO_6", label: "Aero 6" },
  { value: "AERO_7", label: "Aero 7" },
  { value: "AERO_9", label: "Aero 9" },
];

export function FktSubmitForm({ routeId, submitterName, submitterEmail, preferredRigSize }: Props) {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [form, setForm] = useState({
    rigSize: preferredRigSize || "",
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
    console.log('📅 Extracting date from file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isSafari: navigator.userAgent.includes('Safari')
    });

    try {
      const text = await file.text();
      console.log('📖 File read successful, text length:', text.length);

      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      let startTime: Date | null = null;

      if (fileExtension === 'gpx') {
        console.log('🗂️ Parsing as GPX file...');
        const parsed = parseGpxXml(text);
        startTime = parsed.startTime;
        console.log('📅 GPX start time:', startTime);
      } else if (fileExtension === 'vcc') {
        console.log('🗂️ Parsing as VCC file...');
        const parsed = parseVccXml(text);
        console.log('🔍 VCC parse result:', {
          totalPoints: parsed.points.length,
          errors: parsed.errors,
          hasStartTime: !!parsed.startTime,
          startTime: parsed.startTime?.toISOString(),
          metadata: parsed.metadata
        });
        // VCC parser already calculates startTime for us
        startTime = parsed.startTime || null;
        console.log('📅 Final VCC start time:', startTime);
      } else if (fileExtension === 'csv') {
        console.log('🗂️ Parsing as CSV file...');
        const parsed = parseVelocitkCsv(text);
        // CSV parser doesn't pre-calculate startTime, so find first point with timestamp
        const firstTimedPoint = parsed.points.find(p => p.time !== null);
        startTime = firstTimedPoint?.time || null;
        console.log('📅 CSV start time:', startTime, 'from', parsed.points.length, 'points');
      }

      return startTime;
    } catch (error) {
      console.error('❌ Failed to extract date from track file:', error);
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
    console.log('🚀 Starting track file upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userAgent: navigator.userAgent
    });

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

    console.log('📝 Upload request details:', { fileExtension, contentType });

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "gpx", // Keep as "gpx" for S3 bucket compatibility
          filename: file.name,
          contentType: contentType,
        }),
      });

      console.log('📡 Upload URL response:', { status: res.status, ok: res.ok });

      if (!res.ok) {
        const data = await res.json();
        console.error('❌ Upload URL failed:', { status: res.status, error: data });
        throw new Error(`Upload preparation failed (${res.status}): ${data.error ?? "Unknown error"}`);
      }

      const { uploadUrl, key } = await res.json();
      console.log('✅ Got upload URL, starting file upload to S3...');

      setUploadProgress("Uploading track file...");
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });

      console.log('📤 S3 upload response:', { status: uploadRes.status, ok: uploadRes.ok });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text().catch(() => "Unable to read error");
        console.error('❌ S3 upload failed:', { status: uploadRes.status, errorText });
        throw new Error(`File upload to storage failed (${uploadRes.status}). ${errorText ? 'Error: ' + errorText : 'Please check your internet connection and try again.'}`);
      }

      console.log('✅ File upload successful:', { key });
      return key;
    } catch (error) {
      console.error('💥 Upload error:', error);
      throw error;
    }
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
      console.log('🏁 Starting FKT submission:', {
        routeId,
        fileName: trackFile.name,
        extractedDate: extractedDate.toISOString(),
        browser: navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'
      });

      // Step 1: Upload track file to S3
      const gpxS3Key = await uploadTrackFile(trackFile);

      // Step 2: Submit attempt metadata
      setUploadProgress("Validating track...");
      console.log('📝 Submitting FKT attempt data...');

      const submitData = {
        routeId,
        ...form,
        date: extractedDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        gpxS3Key,
        windSpeedKnots: form.windSpeedKnots || null,
      };

      console.log('📤 Submission payload:', submitData);

      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      console.log('📡 FKT submission response:', { status: res.status, ok: res.ok });

      if (!res.ok) {
        const data = await res.json();
        console.error('❌ FKT submission failed:', { status: res.status, data });

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
      console.log('🎉 FKT submission successful:', { attemptId: attempt.id });
      setSuccess(true);
      setTimeout(() => router.push(`/attempts/${attempt.id}`), 1500);
    } catch (err) {
      console.error('💥 FKT submission error:', err);

      let errorMessage = "Unknown error occurred";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      // Add browser-specific context
      if (navigator.userAgent.includes('Safari')) {
        errorMessage += " (Safari detected - if this persists, try using Chrome or Firefox)";
      }

      setError(errorMessage);
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
