"use client";

import { signIn, getProviders } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

export default function SignInPage() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  useEffect(() => {
    (async () => {
      const res = await getProviders();
      setProviders(res);
    })();
  }, []);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await signIn("email", {
        email,
        callbackUrl,
        redirect: false
      });
      // Redirect to verify page
      window.location.href = "/auth/verify";
    } catch (error) {
      console.error("Sign in error:", error);
      setLoading(false);
    }
  };

  if (!providers) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-md text-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl uppercase tracking-wide mb-4">
          Sign In
        </h1>
        <p className="text-muted-foreground">
          Choose your preferred method to access RS Aero FKT
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error === "OAuthSignin" && "Error occurred during OAuth sign-in"}
          {error === "OAuthCallback" && "Error occurred during OAuth callback"}
          {error === "OAuthCreateAccount" && "Could not create OAuth account"}
          {error === "EmailCreateAccount" && "Could not create email account"}
          {error === "Callback" && "Error in callback handler"}
          {error === "OAuthAccountNotLinked" && "Account already exists with different provider"}
          {error === "EmailSignin" && "Error sending email"}
          {error === "CredentialsSignin" && "Invalid credentials"}
          {error === "SessionRequired" && "Please sign in to access this page"}
          {!["OAuthSignin", "OAuthCallback", "OAuthCreateAccount", "EmailCreateAccount", "Callback", "OAuthAccountNotLinked", "EmailSignin", "CredentialsSignin", "SessionRequired"].includes(error) && "An error occurred during sign-in"}
        </div>
      )}

      <div className="space-y-4">
        {/* OAuth Providers (Google, Apple) */}
        {Object.values(providers)
          .filter(provider => provider.id !== "email")
          .map((provider) => (
            <div key={provider.id} className="relative">
              <Button
                onClick={() => signIn(provider.id, { callbackUrl })}
                className="w-full h-12 text-lg font-semibold bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
              >
                <span className="flex items-center justify-center gap-3">
                  {provider.id === "google" && (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </>
                  )}
                  {provider.id === "apple" && (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.017 0C9.396 0 8.924.019 8.712.06c-1.281.236-2.15.896-2.419 1.84-.133.467-.132 1.196.133 1.902.097.258.25.48.44.651.208.187.466.318.759.406.619.187 1.363.234 2.229.234.847 0 1.597-.057 2.24-.240.44-.125.764-.343.979-.663.215-.32.215-.663 0-.982-.215-.32-.539-.537-.979-.663-.643-.183-1.393-.24-2.24-.24-.866 0-1.61.047-2.229.234-.293.088-.551.219-.759.406-.19.171-.343.393-.44.651-.265.706-.266 1.435-.133 1.902.269.944 1.138 1.604 2.419 1.84.212.041.684.06 3.305.06s3.093-.019 3.305-.06c1.281-.236 2.15-.896 2.419-1.84.133-.467.132-1.196-.133-1.902-.097-.258-.25-.48-.44-.651-.208-.187-.466-.318-.759-.406-.619-.187-1.363-.234-2.229-.234z"/>
                      </svg>
                      Continue with Apple
                    </>
                  )}
                </span>
              </Button>
              {provider.id === "google" && (
                <div className="absolute -top-1 -right-1 bg-primary text-white text-xs px-2 py-1 rounded-full font-semibold">
                  Preferred option
                </div>
              )}
            </div>
          ))}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        {/* Email Sign In */}
        {providers.email && (
          <div className="space-y-3">
            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <div>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full h-12 text-lg font-semibold"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Sending email...
                  </div>
                ) : (
                  "Sign in with Email"
                )}
              </Button>
            </form>
            <div className="text-sm text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="font-medium text-yellow-800 mb-1">⏱️ Email delivery notice:</p>
              <p className="text-yellow-700">
                This may take up to 20 minutes and you will have to check your spam folder
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          By signing in, you agree to our{" "}
          <Link href="/guidelines" className="text-primary hover:underline">
            Community Guidelines
          </Link>
        </p>
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