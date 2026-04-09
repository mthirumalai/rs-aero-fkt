"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

interface Props {
  courseId: string;
  token: string;
  coordinateOverrides?: Record<string, number>;
}

export function ApproveCourseFormWithEdit({ courseId, token, coordinateOverrides }: Props) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [result, setResult] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const router = useRouter();

  // Check if coordinates have been modified
  const hasChanges = coordinateOverrides && Object.keys(coordinateOverrides).length > 0;


  async function handleAction(action: "approve" | "reject") {
    setLoading(action);
    setError(null);

    // Use coordinate overrides if provided (coordinates have been edited)
    const coordinateUpdatesForApi = hasChanges ? coordinateOverrides : undefined;

    try {
      const res = await fetch(`/api/courses/${courseId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action,
          rejectionReason,
          coordinateUpdates: coordinateUpdatesForApi
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }
      setResult(action === "approve" ? "approved" : "rejected");
      if (action === "approve") {
        setTimeout(() => router.push(`/courses/${courseId}`), 2000);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  if (result) {
    return (
      <div className={`text-center p-8 rounded-lg border ${
        result === "approved"
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-red-50 border-red-200 text-red-800"
      }`}>
        <p className="text-2xl font-bold mb-2">
          Route {result === "approved" ? "Approved" : "Rejected"}
        </p>
        {hasChanges && result === "approved" && (
          <p className="text-sm mb-2">Coordinates have been updated as requested.</p>
        )}
        {result === "approved"
          ? <p className="text-sm">Redirecting to route page...</p>
          : <p className="text-sm">The submitter has been notified by email.</p>
        }
      </div>
    );
  }

  if (showRejectForm) {
    return (
      <div className="border border-red-200 rounded-lg p-6 bg-red-50 space-y-4">
        <h3 className="font-semibold text-red-800 text-lg">Reject Route</h3>
        <p className="text-sm text-red-700">
          Explain why this route is being rejected and what the submitter should do to fix it.
          This message will be emailed to them directly.
        </p>
        <div className="space-y-2">
          <Label htmlFor="rejectionReason" className="text-red-800">
            Reason & instructions *
          </Label>
          <Textarea
            id="rejectionReason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. The start coordinates appear to be on land rather than at the water's edge. Please adjust to the exact lat/long of the harbour entrance buoy."
            rows={6}
            className="bg-white"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <Button
            onClick={() => handleAction("reject")}
            disabled={!!loading || !rejectionReason.trim()}
            variant="destructive"
            size="lg"
            className="flex-1"
          >
            {loading === "reject" ? "Sending..." : "✗ Confirm Rejection & Notify Submitter"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => { setShowRejectForm(false); setError(null); }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="border rounded-lg p-6 bg-card space-y-6">
      <div className="text-center">
        <h3 className="font-semibold text-lg mb-2">Admin Actions</h3>
        <p className="text-muted-foreground text-sm">
          Review the course details above and choose an action below.
        </p>
      </div>

      {error && <p className="text-red-600 text-sm text-center">{error}</p>}

      {hasChanges && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
          ⚠️ Coordinate changes will be applied when you approve the course.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => handleAction("approve")}
          disabled={!!loading}
          size="lg"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          {loading === "approve" ? "Approving..." : "✓ Approve Course"}
        </Button>
        <Button
          onClick={() => setShowRejectForm(true)}
          variant="destructive"
          size="lg"
          className="flex-1"
        >
          ✗ Reject Course
        </Button>
      </div>
    </div>
  );
}