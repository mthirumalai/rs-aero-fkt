"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  routeId: string;
}

const RIG_SIZES = [
  { value: "AERO_5", label: "Aero 5" },
  { value: "AERO_6", label: "Aero 6" },
  { value: "AERO_7", label: "Aero 7" },
  { value: "AERO_9", label: "Aero 9" },
];

export function FktSubmitForm({ routeId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [form, setForm] = useState({
    rigSize: "",
    date: "",
    windSpeedKnots: "",
    windDirection: "",
    currentNotes: "",
    writeUp: "",
  });
  const [gpxFile, setGpxFile] = useState<File | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function uploadGpx(file: File): Promise<string> {
    setUploadProgress("Getting upload URL...");

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "gpx",
        filename: file.name,
        contentType: "application/gpx+xml",
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to get upload URL");
    }

    const { uploadUrl, key } = await res.json();

    setUploadProgress("Uploading GPX file...");
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": "application/gpx+xml" },
    });

    if (!uploadRes.ok) {
      throw new Error("Failed to upload GPX file to S3");
    }

    return key;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gpxFile) {
      setError("Please select a GPX file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Upload GPX to S3
      const gpxS3Key = await uploadGpx(gpxFile);

      // Step 2: Submit attempt metadata
      setUploadProgress("Validating GPX track...");
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId,
          ...form,
          gpxS3Key,
          windSpeedKnots: form.windSpeedKnots || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        let errMsg = data.error ?? "Submission failed";
        if (data.nearestStartDistanceM) {
          errMsg += ` (nearest start: ${data.nearestStartDistanceM}m)`;
        }
        if (data.nearestEndDistanceM) {
          errMsg += ` (nearest end: ${data.nearestEndDistanceM}m)`;
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      {uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
          {uploadProgress}
        </div>
      )}

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

      <div className="space-y-2">
        <Label htmlFor="date">Date of Attempt *</Label>
        <Input
          id="date"
          type="date"
          value={form.date}
          onChange={(e) => update("date", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gpx">
          GPX Track File *{" "}
          <span className="text-xs text-muted-foreground">(max 10MB)</span>
        </Label>
        <Input
          id="gpx"
          type="file"
          accept=".gpx,application/gpx+xml"
          onChange={(e) => setGpxFile(e.target.files?.[0] ?? null)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Your track must pass within 10m of both the route start and end points.
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
        <Label htmlFor="writeUp">Write-up</Label>
        <Textarea
          id="writeUp"
          value={form.writeUp}
          onChange={(e) => update("writeUp", e.target.value)}
          placeholder="Describe your attempt, conditions, tactics..."
          rows={6}
        />
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
