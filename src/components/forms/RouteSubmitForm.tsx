"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COUNTRY_NAMES, REGION_LABELS, getRegion } from "@/lib/regions";

export function RouteSubmitForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    country: "",
    startName: "",
    startLat: "",
    startLng: "",
    endName: "",
    endLat: "",
    endLng: "",
  });

  const selectedRegion = form.country ? getRegion(form.country) : null;

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startLat: parseFloat(form.startLat),
          startLng: parseFloat(form.startLng),
          endLat: parseFloat(form.endLat),
          endLng: parseFloat(form.endLng),
        }),
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

  if (success) {
    return (
      <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
        <p className="text-2xl font-bold text-green-800 mb-2">Route Submitted!</p>
        <p className="text-green-700">
          Your route has been submitted for admin review. You&apos;ll see it appear on the
          routes page once approved.
        </p>
        <Button
          className="mt-6"
          variant="outline"
          onClick={() => router.push("/routes")}
        >
          Back to Routes
        </Button>
      </div>
    );
  }

  const sortedCountries = Object.entries(COUNTRY_NAMES).sort(([, a], [, b]) =>
    a.localeCompare(b)
  );

  return (
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
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Brief description of the route..."
          rows={3}
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
            className="flex-1 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Select a country...</option>
            {sortedCountries.map(([code, name]) => (
              <option key={code} value={code}>
                {name} ({code})
              </option>
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
          <div className="space-y-2">
            <Label htmlFor="startLat">Latitude *</Label>
            <Input
              id="startLat"
              type="number"
              step="any"
              value={form.startLat}
              onChange={(e) => update("startLat", e.target.value)}
              placeholder="50.515488"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startLng">Longitude *</Label>
            <Input
              id="startLng"
              type="number"
              step="any"
              value={form.startLng}
              onChange={(e) => update("startLng", e.target.value)}
              placeholder="-2.457893"
              required
            />
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="endLat">Latitude *</Label>
            <Input
              id="endLat"
              type="number"
              step="any"
              value={form.endLat}
              onChange={(e) => update("endLat", e.target.value)}
              placeholder="50.611234"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endLng">Longitude *</Label>
            <Input
              id="endLng"
              type="number"
              step="any"
              value={form.endLng}
              onChange={(e) => update("endLng", e.target.value)}
              placeholder="-2.453210"
              required
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-sky-700 hover:bg-sky-800"
        size="lg"
      >
        {loading ? "Submitting..." : "Submit Route for Approval"}
      </Button>
    </form>
  );
}
