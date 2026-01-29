"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Reset Password Page
 * 
 * This page handles password reset when users click the reset link from their email.
 * It verifies the token and allows the user to set a new password.
 */
function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const token = searchParams.get("token");

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setStatus("error");
      setMessage("Missing reset token. Please check your email for a valid link.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(result.message || "Password reset successfully! Redirecting to sign in...");
        form.reset();
        setTimeout(() => {
          router.push("/auth?mode=signin&password_reset=true");
        }, 2000);
      } else {
        setStatus("error");
        setMessage(result.error || "Failed to reset password. Please try again.");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setStatus("error");
      setMessage("An error occurred. Please try again.");
    }
  };

  // Check if token is missing on mount (defer setState to avoid sync setState in effect)
  useEffect(() => {
    if (!token) {
      const t = setTimeout(() => {
        setStatus("error");
        setMessage("Missing reset token. Please check your email for a valid link.");
        setTimeout(() => {
          router.push("/auth?mode=signin&error=missing_token");
        }, 3000);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [token, router]);

  return (
    <div className="min-h-screen bg-deep-navy flex items-center justify-center p-4">
      <div className="bg-card-bg rounded-lg shadow-xl p-8 max-w-md w-full">
        {status === "error" && !token && (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-text-light mb-2">Invalid Link</h2>
            <p className="text-text-light/70 mb-4">{message}</p>
            <button
              onClick={() => router.push("/auth?mode=signin")}
              className="text-cyan hover:text-cyan/80 transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-text-light mb-2">Password Reset!</h2>
            <p className="text-text-light/70">{message}</p>
          </div>
        )}

        {status !== "success" && token && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-text-light mb-2">Reset Your Password</h2>
              <p className="text-text-light/70">
                Enter your new password below.
              </p>
            </div>

            {message && status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg mb-4 text-sm"
              >
                {message}
              </motion.div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm text-text-light/80 mb-2">
                        New Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Enter new password"
                            {...field}
                            className="h-12 pl-12 pr-12 bg-deep-navy/50 border-2 border-indigo/20 focus:border-indigo rounded-xl text-text-light placeholder:text-text-light/30"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light/40 hover:text-text-light/70 transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm text-text-light/80 mb-2">
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40" />
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Confirm new password"
                            {...field}
                            className="h-12 pl-12 pr-12 bg-deep-navy/50 border-2 border-indigo/20 focus:border-indigo rounded-xl text-text-light placeholder:text-text-light/30"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light/40 hover:text-text-light/70 transition-colors"
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full py-4 bg-linear-to-r from-indigo to-indigo/80 hover:from-indigo/90 hover:to-indigo/70 text-white rounded-xl font-semibold shadow-lg shadow-indigo/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? "Resetting Password..." : "Reset Password"}
                </motion.button>
              </form>
            </Form>

            <div className="mt-4 text-center">
              <button
                onClick={() => router.push("/auth?mode=signin")}
                className="text-sm text-cyan hover:text-cyan/80 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-deep-navy flex items-center justify-center">
          <div className="text-text-light">Loading...</div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
