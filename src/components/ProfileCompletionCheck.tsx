"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function ProfileCompletionCheck() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only check when session is loaded and user is authenticated
    if (status === "loading") return;
    if (status === "unauthenticated") return;

    // Don't redirect if already on profile completion page
    if (pathname === "/profile/complete") return;

    // Don't redirect on auth-related pages
    if (pathname.startsWith("/api/auth") || pathname.startsWith("/auth/")) return;

    // If user is authenticated but has no name, redirect to profile completion
    if (session?.user && !session.user.name) {
      console.log("User has no name, redirecting to profile completion");
      router.push("/profile/complete");
    }
  }, [session, status, pathname, router]);

  // This component doesn't render anything
  return null;
}