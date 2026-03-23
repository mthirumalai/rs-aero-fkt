"use client";

import { useState, useEffect } from "react";
import { parseGpxXml, type GpxPoint } from "@/lib/gpx/parser";
import { parseVccXml } from "@/lib/velocitek/vcc-parser";
import { parseVelocitkCsv } from "@/lib/velocitek/parser";
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
        if (!res.ok) throw new Error("Failed to fetch track file");

        // Get the content directly (not JSON)
        const content = await res.text();

        // Determine file type from content-type header or content
        const contentType = res.headers.get('content-type') || '';
        let parsed: { points: GpxPoint[] };

        if (contentType.includes('xml') || content.trim().startsWith('<?xml')) {
          if (content.includes('VelocitekControlCenter')) {
            // VCC file
            parsed = parseVccXml(content);
          } else {
            // GPX file
            parsed = parseGpxXml(content);
          }
        } else if (contentType.includes('csv') || content.includes(',')) {
          // CSV file
          parsed = parseVelocitkCsv(content);
        } else {
          // Default to GPX parsing
          parsed = parseGpxXml(content);
        }

        const sogPoints = computeSog(parsed.points);
        console.log('Distance calculation debug:', {
          contentType,
          totalPoints: parsed.points.length,
          timedPoints: parsed.points.filter(p => p.time !== null).length,
          sogPoints: sogPoints.length,
          finalDistance: sogPoints.length > 0 ? sogPoints[sogPoints.length - 1].distanceNm : null
        });

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