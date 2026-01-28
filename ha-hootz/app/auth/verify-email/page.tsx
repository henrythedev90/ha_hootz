"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Email Verification Page
 * 
 * This page handles email verification when users click the magic link.
 * It calls the API to verify the token and update the user's emailVerified status,
 * then redirects to the sign-in page.
 */
function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Missing verification token. Please check your email for a valid link.");
        setTimeout(() => {
          router.push("/auth?mode=signin&error=missing_token");
        }, 3000);
        return;
      }

      try {
        // Call API route to verify email (returns JSON)
        const response = await fetch(`/api/auth/verify-email-json?token=${encodeURIComponent(token)}`, {
          method: "GET",
        });

        const data = await response.json();

        if (data.success) {
          // Success
          setStatus("success");
          setMessage("Email verified successfully! Redirecting to sign in...");
          setTimeout(() => {
            router.push("/auth?mode=signin&verified=true");
          }, 1500);
        } else {
          // Error
          setStatus("error");
          const errorType = data.error;
          if (errorType === "invalid_token" || errorType === "missing_token") {
            setMessage("Invalid or expired verification link. Please request a new one.");
          } else {
            setMessage("Email verification failed. Please try again.");
          }
          setTimeout(() => {
            router.push(`/auth?mode=signin&error=${errorType || "verification_failed"}`);
          }, 3000);
        }
      } catch (error) {
        console.error("Email verification error:", error);
        setStatus("error");
        setMessage("Email verification failed. Please try again.");
        setTimeout(() => {
          router.push("/auth?mode=signin&error=verification_failed");
        }, 3000);
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-deep-navy flex items-center justify-center p-4">
      <div className="bg-card-bg rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        {status === "verifying" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-text-light mb-2">Verifying Email</h2>
            <p className="text-text-light/70">{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-400"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-light mb-2">Email Verified!</h2>
            <p className="text-text-light/70">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-light mb-2">Verification Failed</h2>
            <p className="text-text-light/70">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-deep-navy flex items-center justify-center">
          <div className="text-text-light">Loading...</div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
