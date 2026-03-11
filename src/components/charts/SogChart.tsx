"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { SogPoint } from "@/lib/gpx/sog";

interface Props {
  sogPoints: SogPoint[];
  currentTimeMs: number;
}

export default function SogChart({ sogPoints, currentTimeMs }: Props) {
  if (sogPoints.length === 0) return null;

  const startMs = sogPoints[0].timeMs;

  const data = sogPoints.map((p) => ({
    elapsed: Math.round((p.timeMs - startMs) / 1000),
    sog: p.sogKnots,
    timeMs: p.timeMs,
  }));

  const currentElapsed = Math.round((currentTimeMs - startMs) / 1000);

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="elapsed"
          tickFormatter={formatTime}
          tick={{ fontSize: 11 }}
          label={{ value: "Time", position: "insideRight", offset: -5, fontSize: 11 }}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          label={{ value: "SOG (kts)", angle: -90, position: "insideLeft", fontSize: 11 }}
        />
        <Tooltip
          formatter={(value: unknown) => {
            const v = typeof value === "number" ? value : 0;
            return [`${v.toFixed(1)} kts`, "SOG"];
          }}
          labelFormatter={(label: unknown) => {
            const l = typeof label === "number" ? label : 0;
            return `Time: ${formatTime(l)}`;
          }}
        />
        <Line
          type="monotone"
          dataKey="sog"
          stroke="#0ea5e9"
          dot={false}
          strokeWidth={1.5}
        />
        <ReferenceLine
          x={currentElapsed}
          stroke="#f97316"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
