"use client";

import dynamic from "next/dynamic";

const RouteMapInner = dynamic(() => import("./RouteMapInner"), {
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
  endLat: number;
  endLng: number;
  startName: string;
  endName: string;
}

export function RouteMap(props: Props) {
  return <RouteMapInner {...props} />;
}
