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
  initialPreferredRigSize?: string;
}

export function ProfileEditForm({ userId, initialBio, initialLocation, initialPreferredRigSize }: Props) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(initialBio);
  const [location, setLocation] = useState(initialLocation);
  const [preferredRigSize, setPreferredRigSize] = useState(initialPreferredRigSize || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      await fetch(`/api/athletes/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, location, preferredRigSize: preferredRigSize || null }),
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
        <Label htmlFor="preferredRigSize">Preferred Rig Size</Label>
        <select
          id="preferredRigSize"
          value={preferredRigSize}
          onChange={(e) => setPreferredRigSize(e.target.value)}
          className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        >
          <option value="">Select preferred rig size</option>
          <option value="AERO_5">Aero 5</option>
          <option value="AERO_6">Aero 6</option>
          <option value="AERO_7">Aero 7</option>
          <option value="AERO_9">Aero 9</option>
        </select>
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
          className="bg-primary hover:bg-primary"
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
