"use client";

import { useState, useCallback } from "react";
import { PhotoUploadForm } from "@/components/forms/PhotoUploadForm";
import { getPublicPhotoUrl as getPhotoUrl } from "@/lib/storage";

interface Photo {
  id: string;
  s3Key: string;
  caption: string | null;
  createdAt: Date;
}

interface Props {
  initialPhotos: Photo[];
  attemptId: string;
  canUploadPhotos: boolean;
}

export function AttemptPhotosSection({ initialPhotos, attemptId, canUploadPhotos }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);

  const handlePhotosUploaded = useCallback(async () => {
    // Refresh photos by re-fetching them
    try {
      const res = await fetch(`/api/attempts/${attemptId}/photos`);
      if (res.ok) {
        const newPhotos = await res.json();
        setPhotos(newPhotos);
      }
    } catch (error) {
      console.error("Failed to refresh photos:", error);
      // Fallback to page reload
      window.location.reload();
    }
  }, [attemptId]);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Photos</h2>

      {photos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {photos.map((photo) => (
            <div key={photo.id} className="space-y-2">
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={getPhotoUrl(photo.s3Key)}
                  alt={photo.caption ?? "Attempt photo"}
                  className="w-full h-full object-cover"
                />
              </div>
              {photo.caption && (
                <p className="text-sm text-muted-foreground">{photo.caption}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mb-6">No photos uploaded for this attempt.</p>
      )}

      {canUploadPhotos && (
        <PhotoUploadForm
          attemptId={attemptId}
          onPhotosUploaded={handlePhotosUploaded}
        />
      )}
    </div>
  );
}