"use client";

import dynamic from "next/dynamic";

const PointMapInner = dynamic(() => import("./PointMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
      Loading map...
    </div>
  ),
});

interface Props {
  lat: number;
  lng: number;
  name: string;
  type: "start" | "end" | "turning";
  pointType?: "POINT" | "LINE";
  lat2?: number;
  lng2?: number;
}

export function PointMap(props: Props) {
  return <PointMapInner {...props} />;
}