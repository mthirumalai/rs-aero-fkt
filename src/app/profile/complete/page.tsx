"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ProfileCompletePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [preferredRigSize, setPreferredRigSize] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if user already has a name
  if (session?.user?.name) {
    router.push("/");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/athletes/${session?.user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim() || undefined,
          location: location.trim() || undefined,
          preferredRigSize: preferredRigSize || undefined,
        }),
      });

      if (response.ok) {
        // Update the session to reflect the new name
        await update();
        // Redirect to home page
        router.push("/");
      } else {
        alert("Failed to update profile. Please try again.");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Welcome to RS Aero FKT!</h1>
        <p className="text-muted-foreground">
          Let's complete your profile so other sailors can recognize your achievements.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name" className="text-base font-semibold">
            Your Name <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-muted-foreground mb-2">
            This will be displayed on your FKT attempts and leaderboards.
          </p>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            required
            className="text-base"
          />
        </div>

        <div>
          <Label htmlFor="preferredRigSize" className="text-base font-semibold">
            What rig do you normally sail? <span className="text-muted-foreground">(optional)</span>
          </Label>
          <p className="text-sm text-muted-foreground mb-2">
            This will be used as the default when submitting FKT attempts.
          </p>
          <select
            id="preferredRigSize"
            value={preferredRigSize}
            onChange={(e) => setPreferredRigSize(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            <option value="">Select your preferred rig size</option>
            <option value="AERO_5">Aero 5</option>
            <option value="AERO_6">Aero 6</option>
            <option value="AERO_7">Aero 7</option>
            <option value="AERO_9">Aero 9</option>
          </select>
        </div>

        <div>
          <Label htmlFor="location" className="text-base font-semibold">
            Location <span className="text-muted-foreground">(optional)</span>
          </Label>
          <p className="text-sm text-muted-foreground mb-2">
            Help other sailors know where you're based.
          </p>
          <Input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., San Francisco, CA"
            className="text-base"
          />
        </div>

        <div>
          <Label htmlFor="bio" className="text-base font-semibold">
            About You <span className="text-muted-foreground">(optional)</span>
          </Label>
          <p className="text-sm text-muted-foreground mb-2">
            Tell other sailors about your sailing background or interests.
          </p>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="e.g., Been sailing RS Aeros for 5 years, love racing in challenging conditions..."
            rows={3}
            className="text-base"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={!name.trim() || loading}
            className="flex-1"
          >
            {loading ? "Saving..." : "Complete Profile"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          You can update this information anytime in your profile settings.
        </p>
      </form>
    </div>
  );
}