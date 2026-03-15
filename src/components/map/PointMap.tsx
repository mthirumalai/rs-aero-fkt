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
  type: "start" | "end";
}

export function PointMap(props: Props) {
  return <PointMapInner {...props} />;
}