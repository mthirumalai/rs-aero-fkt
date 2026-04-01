"use client";

import dynamic from "next/dynamic";

const ApprovalMapInner = dynamic(() => import("./ApprovalMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
      Loading map...
    </div>
  ),
});

interface Props {
  startLat: number; startLng: number; finishLat: number; finishLng: number;
  startName: string; finishName: string;
}

export function ApprovalMap(props: Props) {
  return <ApprovalMapInner {...props} />;
}
