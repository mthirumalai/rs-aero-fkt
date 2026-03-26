"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  attemptId: string;
  onPhotosUploaded: () => void;
}

export function PhotoUploadForm({ attemptId, onPhotosUploaded }: Props) {
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [captions, setCaptions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setPhotoFiles(fileArray);
      setCaptions(new Array(fileArray.length).fill(""));
    }
  }

  function updateCaption(index: number, caption: string) {
    setCaptions(prev => {
      const newCaptions = [...prev];
      newCaptions[index] = caption;
      return newCaptions;
    });
  }

  function removePhoto(index: number) {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setCaptions(prev => prev.filter((_, i) => i !== index));
  }

  async function uploadPhotoFile(file: File): Promise<string> {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "photo",
        filename: file.name,
        contentType: file.type,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(`Photo upload preparation failed: ${data.error ?? "Unknown error"}`);
    }

    const { uploadUrl, key } = await res.json();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!uploadRes.ok) {
      throw new Error(`Photo upload to storage failed`);
    }

    return key;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (photoFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        const caption = captions[i]?.trim() || null;

        // Upload to S3
        const s3Key = await uploadPhotoFile(file);

        // Create photo record
        const photoRes = await fetch("/api/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            s3Key,
            caption,
          }),
        });

        if (!photoRes.ok) {
          const data = await photoRes.json();
          throw new Error(data.error || "Failed to save photo");
        }
      }

      // Reset form
      setPhotoFiles([]);
      setCaptions([]);

      // Notify parent to refresh
      onPhotosUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photos");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card border rounded-lg p-4">
      <h3 className="font-semibold">Upload Additional Photos</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="newPhotos">Select Photos</Label>
        <Input
          id="newPhotos"
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
          disabled={uploading}
        />
        <p className="text-xs text-muted-foreground">
          Select one or more photos to upload (max 10MB per photo)
        </p>
      </div>

      {photoFiles.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {photoFiles.length} photo{photoFiles.length !== 1 ? 's' : ''} selected:
          </p>

          {photoFiles.map((file, index) => (
            <div key={index} className="bg-muted rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate flex-1">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="text-red-600 hover:text-red-800 text-sm ml-2"
                  disabled={uploading}
                >
                  Remove
                </button>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`caption-${index}`} className="text-xs">
                  Caption (optional)
                </Label>
                <Textarea
                  id={`caption-${index}`}
                  placeholder="Describe this photo..."
                  value={captions[index] || ""}
                  onChange={(e) => updateCaption(index, e.target.value)}
                  disabled={uploading}
                  rows={2}
                />
              </div>
            </div>
          ))}

          <Button
            type="submit"
            disabled={uploading}
            className="w-full"
          >
            {uploading ? "Uploading..." : `Upload ${photoFiles.length} Photo${photoFiles.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      )}
    </form>
  );
}