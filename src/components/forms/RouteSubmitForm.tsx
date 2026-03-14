"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRY_NAMES, REGION_LABELS, getRegion } from "@/lib/regions";
import { parseCoordinate, formatCoord } from "@/lib/coords";

export function RouteSubmitForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCoordErrors({});

    const startLat = validateCoord("startLat", form.startLat, "lat");
    const startLng = validateCoord("startLng", form.startLng, "lng");
    const endLat   = validateCoord("endLat",   form.endLat,   "lat");
    const endLng   = validateCoord("endLng",   form.endLng,   "lng");

    if (startLat === null || startLng === null || endLat === null || endLng === null) return;

    setLoading(true);
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, startLat, startLng, endLat, endLng }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Submission failed");
        return;
      }
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
        <p className="text-2xl font-bold text-green-800 mb-2">Route Submitted!</p>
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

  function CoordField({ id, label, value, type }: {
    id: keyof typeof form; label: string; value: string; type: "lat" | "lng";
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
          placeholder={placeholder}
          required
          autoComplete="off"
        />
        {coordErrors[id] ? (
          <p className="text-xs text-destructive">{coordErrors[id]}</p>
        ) : (
          (() => {
            if (!value) return null;
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
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
          <CoordField id="startLat" label="Latitude"  value={form.startLat} type="lat" />
          <CoordField id="startLng" label="Longitude" value={form.startLng} type="lng" />
        </div>
      </div>

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
          <CoordField id="endLat" label="Latitude"  value={form.endLat} type="lat" />
          <CoordField id="endLng" label="Longitude" value={form.endLng} type="lng" />
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
