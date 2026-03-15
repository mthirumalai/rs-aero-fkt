"use client";

import { TrackPlayback } from "./TrackPlayback";

interface Props {
  attemptId: string;
}

export function TrackPlaybackSection({ attemptId }: Props) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Track Playback</h2>
      <TrackPlayback
        attemptId={attemptId}
      />
    </div>
  );
}