"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Props {
  routeId: string;
  token: string;
}

export function ApproveRouteForm({ routeId, token }: Props) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [result, setResult] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleAction(action: "approve" | "reject") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/routes/${routeId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
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
      <div
        className={`text-center p-8 rounded-lg border ${
          result === "approved"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}
      >
        <p className="text-2xl font-bold mb-2">
          Route {result === "approved" ? "Approved" : "Rejected"}!
        </p>
        {result === "approved" && (
          <p className="text-sm">Redirecting to route page...</p>
        )}
      </div>
    );
  }

  return (
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
        onClick={() => handleAction("reject")}
        disabled={!!loading}
        variant="destructive"
        className="flex-1"
        size="lg"
      >
        {loading === "reject" ? "Rejecting..." : "✗ Reject Route"}
      </Button>
      {error && (
        <p className="text-red-600 text-sm mt-2 w-full">{error}</p>
      )}
    </div>
  );
}
