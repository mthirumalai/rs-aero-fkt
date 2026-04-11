"use client";

import dynamic from "next/dynamic";

const CourseMapInner = dynamic(() => import("./CourseMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
      Loading map...
    </div>
  ),
});

interface Props {
  startLat: number;
  startLng: number;
  finishLat: number;
  finishLng: number;
  startName: string;
  finishName: string;
  turningMarkLat?: number;
  turningMarkLng?: number;
  turningMarkName?: string;
  courseType?: "ONE_WAY" | "OUT_AND_BACK";
  startType?: "POINT" | "LINE";
  startLine2Lat?: number | null;
  startLine2Lng?: number | null;
  finishType?: "POINT" | "LINE";
  finishLine2Lat?: number | null;
  finishLine2Lng?: number | null;
}

export function CourseMap(props: Props) {
  return <CourseMapInner {...props} />;
}
