"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The verification link has expired or already been used.",
  OAuthSignin: "Error occurred during OAuth sign-in process.",
  OAuthCallback: "Error occurred during OAuth callback.",
  OAuthCreateAccount: "Could not create OAuth account.",
  EmailCreateAccount: "Could not create email account.",
  Callback: "Error in callback handler.",
  OAuthAccountNotLinked: "Account already exists with different provider.",
  EmailSignin: "Error sending email.",
  CredentialsSignin: "Invalid credentials provided.",
  SessionRequired: "Please sign in to access this page.",
  InvalidCheck: "OAuth verification failed. Please try signing in again.",
  default: "An authentication error occurred.",
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "default";

  const errorMessage = errorMessages[error] || errorMessages.default;

  return (
    <div className="container mx-auto px-4 py-12 max-w-md text-center">
      <div className="mb-8">
        <h1 className="font-display text-4xl uppercase tracking-wide mb-4 text-red-600">
          Authentication Error
        </h1>
        <p className="text-muted-foreground mb-6">
          {errorMessage}
        </p>

        {error === "InvalidCheck" && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            <p className="font-medium text-yellow-800 mb-2">💡 Quick Fix:</p>
            <p className="text-yellow-700">
              This usually happens with stale browser data. Try signing in using an incognito/private window.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Button asChild className="w-full">
          <Link href="/auth/signin">
            Try Again
          </Link>
        </Button>

        <Button asChild variant="outline" className="w-full">
          <Link href="/">
            Back to Home
          </Link>
        </Button>
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        <p>Error Code: {error}</p>
        <p className="mt-2">
          Need help?{" "}
          <Link href="/contact" className="text-primary hover:underline">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
}