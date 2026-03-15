"use client";

import { useState } from "react";
import { TrackPlayback } from "./TrackPlayback";

interface Props {
  attemptId: string;
}

interface PlaybackData {
  elapsedSec: number;
  currentTimeMs: number;
  distanceNm: number;
  isLoaded: boolean;
}

export function TrackPlaybackSection({ attemptId }: Props) {
  const [playbackData, setPlaybackData] = useState<PlaybackData>({
    elapsedSec: 0,
    currentTimeMs: 0,
    distanceNm: 0,
    isLoaded: false,
  });

  function formatElapsedTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="mb-8">
      {/* Header with info box */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Track Playback</h2>

        {playbackData.isLoaded && (
          <div className="bg-card border rounded-lg px-4 py-2">
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="text-muted-foreground">Elapsed</div>
                <div className="font-mono font-medium">{formatElapsedTime(playbackData.elapsedSec)}</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Local Time</div>
                <div className="font-medium">{new Date(playbackData.currentTimeMs).toLocaleTimeString('en-US', { hour12: false })}</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Distance</div>
                <div className="font-medium">{playbackData.distanceNm.toFixed(2)} nm</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Track Playback Component */}
      <TrackPlayback
        attemptId={attemptId}
      />
    </div>
  );
}