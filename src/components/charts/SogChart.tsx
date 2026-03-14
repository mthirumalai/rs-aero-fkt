"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import type { SogPoint } from "@/lib/gpx/sog";

interface Props {
  sogPoints: SogPoint[];
  currentTimeMs: number;
}

export default function SogChart({ sogPoints, currentTimeMs }: Props) {
  console.log('SogChart called with:', { sogPointsLength: sogPoints.length, currentTimeMs });

  if (sogPoints.length === 0) {
    console.log('SogChart: No sog points, returning null');
    return null;
  }

  const startMs = sogPoints[0].timeMs;
  const currentElapsed = Math.round((currentTimeMs - startMs) / 1000);

  // Find the closest data point to current time
  const currentPointIndex = sogPoints.reduce((closest, point, index) => {
    const elapsed = Math.round((point.timeMs - startMs) / 1000);
    const currentClosest = sogPoints[closest];
    const closestElapsed = Math.round((currentClosest.timeMs - startMs) / 1000);

    return Math.abs(elapsed - currentElapsed) < Math.abs(closestElapsed - currentElapsed) ? index : closest;
  }, 0);

  const data = sogPoints.map((p, index) => ({
    elapsed: Math.round((p.timeMs - startMs) / 1000),
    sog: p.sogKnots,
    distance: p.distanceNm,
    timeMs: p.timeMs,
    wallClockUTC: new Date(p.timeMs).toISOString().substr(11, 8), // HH:MM:SS UTC
    wallClockLocal: new Date(p.timeMs).toLocaleTimeString('en-US', { hour12: false }), // Local time HH:MM:SS
    // Add current position marker - show on closest point
    currentPosition: index === currentPointIndex ? p.sogKnots : null,
  }));

  // Debug: Log values to help diagnose pink line issues
  console.log('SogChart Debug:', {
    currentTimeMs,
    startMs,
    currentElapsed,
    sogPointsLength: sogPoints.length
  });

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    // Always show HH:MM:SS format
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 50, left: 75, bottom: 35 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.6} stroke="#666" />
          <XAxis
            dataKey="elapsed"
            tickFormatter={formatTime}
            tick={{ fontSize: 12, fill: "#374151", fontWeight: 500 }}
            label={{ value: "Elapsed Time", position: "insideBottom", offset: -10, fontSize: 12, style: { fill: "#374151", fontWeight: "600" } }}
            axisLine={{ stroke: "#374151", strokeWidth: 2 }}
            tickLine={{ stroke: "#374151", strokeWidth: 1.5 }}
          />
          <YAxis
            yAxisId="sog"
            tick={{ fontSize: 12, fill: "#0ea5e9", fontWeight: 600 }}
            label={{ value: "SOG (kts)", angle: 0, position: "top", offset: 10, fontSize: 12, style: { fill: "#0ea5e9", fontWeight: "600" } }}
            axisLine={{ stroke: "#0ea5e9", strokeWidth: 2 }}
            tickLine={{ stroke: "#0ea5e9", strokeWidth: 1.5 }}
          />
          <YAxis
            yAxisId="distance"
            orientation="right"
            tick={{ fontSize: 12, fill: "#10b981", fontWeight: 600 }}
            label={{ value: "Distance (nm)", angle: 0, position: "top", offset: 10, fontSize: 12, style: { fill: "#10b981", fontWeight: "600" } }}
            axisLine={{ stroke: "#10b981", strokeWidth: 2 }}
            tickLine={{ stroke: "#10b981", strokeWidth: 1.5 }}
          />
          <Tooltip
            formatter={(value: unknown, name: unknown) => {
              const v = typeof value === "number" ? value : 0;
              if (name === "sog") return [`${v.toFixed(1)} kts`, "SOG"];
              if (name === "distance") return [`${v.toFixed(2)} nm`, "Distance"];
              return [v, name];
            }}
            labelFormatter={(label: unknown, payload: any) => {
              const l = typeof label === "number" ? label : 0;
              const elapsedTime = formatTime(l);
              const wallClockLocal = payload?.[0]?.payload?.wallClockLocal || "";
              const wallClockUTC = payload?.[0]?.payload?.wallClockUTC || "";
              return `Elapsed: ${elapsedTime} | Local: ${wallClockLocal} | UTC: ${wallClockUTC}`;
            }}
          />
          <Line
            yAxisId="sog"
            type="monotone"
            dataKey="sog"
            stroke="#0ea5e9"
            dot={false}
            strokeWidth={1.5}
            name="sog"
          />
          <Line
            yAxisId="distance"
            type="monotone"
            dataKey="distance"
            stroke="#10b981"
            dot={false}
            strokeWidth={1.5}
            name="distance"
          />
          {/* Large pink current position marker */}
          <Line
            yAxisId="sog"
            type="monotone"
            dataKey="currentPosition"
            stroke="#ec4899"
            strokeWidth={4}
            dot={{
              fill: "#ec4899",
              r: 10,
              stroke: "#ffffff",
              strokeWidth: 3
            }}
            connectNulls={false}
            name="⏵ Current Position"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
