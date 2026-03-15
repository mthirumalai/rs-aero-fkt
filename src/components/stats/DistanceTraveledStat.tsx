"use client";

import { useState, useEffect } from "react";
import { parseGpxXml } from "@/lib/gpx/parser";
import { computeSog } from "@/lib/gpx/sog";

interface Props {
  attemptId: string;
}

export function DistanceTraveledStat({ attemptId }: Props) {
  const [distanceNm, setDistanceNm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDistance() {
      try {
        const res = await fetch(`/api/attempts/${attemptId}/gpx`);
        if (!res.ok) throw new Error("Failed to fetch GPX URL");
        const { url } = await res.json();

        const gpxRes = await fetch(url);
        if (!gpxRes.ok) throw new Error("Failed to download GPX");
        const xml = await gpxRes.text();

        const parsed = parseGpxXml(xml);
        const sogPoints = computeSog(parsed.points);

        if (sogPoints.length > 0) {
          setDistanceNm(sogPoints[sogPoints.length - 1].distanceNm);
        }
      } catch (err) {
        console.error("Failed to load distance:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDistance();
  }, [attemptId]);

  if (loading) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  if (distanceNm === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  return <span>{distanceNm.toFixed(2)} nm</span>;
}