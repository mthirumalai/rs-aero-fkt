"use client";

import dynamic from "next/dynamic";

const EditablePointMapInner = dynamic(() => import("./EditablePointMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
      Loading map...
    </div>
  ),
});

interface Props {
  lat: number | null;
  lng: number | null;
  name: string;
  type: "start" | "end" | "turning";
  onCoordinateChange: (lat: number, lng: number) => void;
  disabled?: boolean;
}

export function EditablePointMap(props: Props) {
  return <EditablePointMapInner {...props} />;
}