"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  courseId: string;
  courseName: string;
}

export function RevokeButton({ courseId, courseName }: Props) {
  const router = useRouter();
  const [isRevoking, setIsRevoking] = useState(false);

  async function handleRevoke() {
    const confirmed = window.confirm(
      `Are you sure you want to revoke approval for "${courseName}"?\n\n` +
      `This will:\n` +
      `• Hide the course from public listings\n` +
      `• Mark all associated FKT attempts as revoked\n` +
      `• Remove them from the news feed and rankings\n` +
      `• Move the course to the admin Manage Courses page\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsRevoking(true);

    try {
      const response = await fetch(`/api/courses/${courseId}/revoke`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to revoke course");
      }

      // Refresh the page to show updated status
      router.refresh();
    } catch (error) {
      console.error("Error revoking course:", error);
      alert(error instanceof Error ? error.message : "Failed to revoke course");
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="destructive"
      className="text-xs h-6 px-2 py-0"
      onClick={handleRevoke}
      disabled={isRevoking}
    >
      {isRevoking ? "..." : "Revoke"}
    </Button>
  );
}