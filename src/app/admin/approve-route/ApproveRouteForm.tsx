"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

interface Props {
  routeId: string;
  token: string;
}

export function ApproveRouteForm({ routeId, token }: Props) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [result, setResult] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const router = useRouter();

  async function handleAction(action: "approve" | "reject") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/routes/${routeId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, rejectionReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        return;
      }
      setResult(action === "approve" ? "approved" : "rejected");
      if (action === "approve") {
        setTimeout(() => router.push(`/routes/${routeId}`), 2000);
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
            disabled={!!loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <Button
          onClick={() => handleAction("approve")}
          disabled={!!loading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          {loading === "approve" ? "Approving..." : "✓ Approve Route"}
        </Button>
        <Button
          onClick={() => setShowRejectForm(true)}
          disabled={!!loading}
          variant="destructive"
          className="flex-1"
          size="lg"
        >
          ✗ Reject Route
        </Button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
