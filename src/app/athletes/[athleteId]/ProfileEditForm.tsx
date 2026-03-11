"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  userId: string;
  initialBio: string;
  initialLocation: string;
}

export function ProfileEditForm({ userId, initialBio, initialLocation }: Props) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(initialBio);
  const [location, setLocation] = useState(initialLocation);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      await fetch(`/api/athletes/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, location }),
      });
      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit Profile
        </Button>
        {success && (
          <span className="text-sm text-green-600">Profile updated!</span>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      <h3 className="font-semibold">Edit Profile</h3>
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Weymouth, UK"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell the community about yourself..."
          rows={3}
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-sky-700 hover:bg-sky-800"
          size="sm"
        >
          {loading ? "Saving..." : "Save"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(false)}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
