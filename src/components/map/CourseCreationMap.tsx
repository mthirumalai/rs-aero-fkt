"use client";

import dynamic from "next/dynamic";
import type { GpxPoint } from "@/lib/gpx/parser";

interface Props {
  points: GpxPoint[];
  selectedStartIndex: number | null;
  selectedEndIndex: number | null;
  onPointSelect: (index: number, type: "start" | "end") => void;
  selectionMode: "start" | "end" | null;
}

// Dynamic import to avoid SSR issues with Leaflet
const CourseCreationMapInner = dynamic(() => import("./CourseCreationMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center">
      Loading map...
    </div>
  ),
});

export default function CourseCreationMap(props: Props) {
  return <CourseCreationMapInner {...props} />;
}