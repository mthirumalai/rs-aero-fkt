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
}

export function CourseMap(props: Props) {
  return <CourseMapInner {...props} />;
}
