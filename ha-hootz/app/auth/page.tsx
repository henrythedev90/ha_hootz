"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, Sparkles } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

const signInSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z
  .object({
    name: z.string().optional(),
    email: z
      .string()
      .email("Invalid email address")
      .min(1, "Email is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "signin";
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsSignUp(mode === "signup");
    
    // Handle URL query parameters for verification status
    const verified = searchParams.get("verified");
    const errorParam = searchParams.get("error");
    
    if (verified === "true") {
      setSuccess("Email verified successfully! You can now sign in.");
      setError("");
    } else if (errorParam === "invalid_token" || errorParam === "missing_token") {
      setError("Invalid or expired verification link. Please request a new one.");
    } else if (errorParam === "verification_failed") {
      setError("Email verification failed. Please try again.");
    }
  }, [mode, searchParams]);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSignIn = async (data: SignInFormData) => {
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Check if error is due to unverified email
        // NextAuth doesn't expose this directly, so we'll show a generic message
        // and provide option to resend verification
        setError("Invalid email or password. If you just signed up, please verify your email first.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = async (data: SignUpFormData) => {
    setError("");
    setLoading(true);

    try {
      // Register user
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
        }),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        setError(registerData.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Registration successful - show success message about email verification
      setSuccess(registerData.message || "Account created! Please check your email to verify your account.");
      setError("");
      signUpForm.reset();
      
      // Don't auto sign in - user must verify email first
      setLoading(false);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    const newMode = isSignUp ? "signin" : "signup";
    router.push(`/auth?mode=${newMode}`);
    setError("");
    signInForm.reset();
    signUpForm.reset();
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="min-h-screen bg-deep-navy relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-indigo to-cyan rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 left-0 w-96 h-96 bg-linear-to-tr from-cyan to-indigo rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Toggle Switch */}
        <div className="mb-8 flex justify-center">
          <div className="relative bg-card-bg rounded-full p-1.5 border border-indigo/30 inline-flex">
            <motion.div
              animate={{
                x: isSignUp ? "100%" : "0%",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] bg-linear-to-r from-indigo to-indigo/80 rounded-full"
            />
            <div className="relative flex">
              <button
                type="button"
                onClick={() => {
                  if (isSignUp) toggleMode();
                }}
                className={`px-8 py-2 rounded-full transition-colors z-10 relative ${
                  !isSignUp ? "text-white font-medium" : "text-text-light/60"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isSignUp) toggleMode();
                }}
                className={`px-8 py-2 rounded-full transition-colors z-10 relative ${
                  isSignUp ? "text-white font-medium" : "text-text-light/60"
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>

        {/* Logo and Title */}
        <motion.div
          key={isSignUp ? "signup" : "signin"}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{
              rotate: [0, 5, -5, 0],
            }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="inline-block mb-4"
          >
            <Sparkles className="w-16 h-16 mx-auto text-cyan" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-linear-to-r from-indigo via-cyan to-indigo bg-clip-text text-transparent">
            {isSignUp ? "Create your account" : "Sign in to Ha Hootz"}
          </h1>
          <p className="text-text-light/60">
            {isSignUp
              ? "Join the ultimate trivia experience"
              : "Welcome back! Ready for some trivia?"}
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          layout
          className="min-h-[500px] bg-card-bg/80 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-indigo/30 shadow-2xl flex flex-col"
        >
          <AnimatePresence mode="wait">
            {isSignUp ? (
              <Form {...signUpForm} key="signup">
                <form
                  className="mt-8 space-y-5 flex flex-col flex-1"
                  onSubmit={signUpForm.handleSubmit(onSignUp)}
                >
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg"
                    >
                      {error}
                    </motion.div>
                  )}
                  <div className="space-y-5">
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FormField
                        control={signUpForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="block text-sm text-text-light/80 mb-2">
                              Name{" "}
                              <span className="text-text-light/40">
                                (optional)
                              </span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40" />
                                <Input
                                  type="text"
                                  placeholder="Your name"
                                  className="h-12 pl-12 bg-deep-navy/50 border-2 border-indigo/20 focus:border-indigo rounded-xl text-text-light placeholder:text-text-light/30"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="block text-sm text-text-light/80 mb-2">
                            Email address
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40" />
                              <Input
                                type="email"
                                autoComplete="email"
                                placeholder="Email address"
                                className="h-12 pl-12 bg-deep-navy/50 border-2 border-indigo/20 focus:border-indigo rounded-xl text-text-light placeholder:text-text-light/30"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="block text-sm text-text-light/80 mb-2">
                            Password{" "}
                            <span className="text-text-light/40">
                              (min 6 characters)
                            </span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="Password (min 6 characters)"
                                {...field}
                                className="h-12 pl-12 pr-12 bg-deep-navy/50 border-2 border-indigo/20 focus:border-indigo rounded-xl text-text-light placeholder:text-text-light/30"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light/40 hover:text-text-light/70 transition-colors"
                                aria-label={
                                  showPassword
                                    ? "Hide password"
                                    : "Show password"
                                }
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
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FormField
                        control={signUpForm.control}
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
                                  type={
                                    showConfirmPassword ? "text" : "password"
                                  }
                                  autoComplete="new-password"
                                  placeholder="Confirm password"
                                  {...field}
                                  className="h-12 pl-12 pr-12 bg-deep-navy/50 border-2 border-indigo/20 focus:border-indigo rounded-xl text-text-light placeholder:text-text-light/30"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                  }
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light/40 hover:text-text-light/70 transition-colors"
                                  aria-label={
                                    showConfirmPassword
                                      ? "Hide password"
                                      : "Show password"
                                  }
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
                    </motion.div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-linear-to-r from-indigo to-indigo/80 hover:from-indigo/90 hover:to-indigo/70 text-white rounded-xl font-semibold shadow-lg shadow-indigo/30 transition-all mt-auto"
                  >
                    {loading ? "Creating account..." : "Create account"}
                  </motion.button>
                </form>
              </Form>
            ) : (
              <Form {...signInForm} key="signin">
                <form
                  className="mt-8 space-y-5 flex flex-col flex-1"
                  onSubmit={signInForm.handleSubmit(onSignIn)}
                >
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg"
                    >
                      {error}
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg"
                    >
                      {success}
                    </motion.div>
                  )}
                  <div className="space-y-5">
                    <FormField
                      control={signInForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="block text-sm text-text-light/80 mb-2">
                            Email address
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40" />
                              <Input
                                type="email"
                                autoComplete="email"
                                placeholder="Email address"
                                {...field}
                                className="h-12 pl-12 bg-deep-navy/50 border-2 border-indigo/20 focus:border-indigo rounded-xl text-text-light placeholder:text-text-light/30"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signInForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="block text-sm text-text-light/80 mb-2">
                            Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="Password"
                                {...field}
                                className="h-12 pl-12 pr-12 bg-deep-navy/50 border-2 border-indigo/20 focus:border-indigo rounded-xl text-text-light placeholder:text-text-light/30"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light/40 hover:text-text-light/70 transition-colors"
                                aria-label={
                                  showPassword
                                    ? "Hide password"
                                    : "Show password"
                                }
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
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      className="text-sm text-cyan hover:text-cyan/80 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-linear-to-r from-indigo to-indigo/80 hover:from-indigo/90 hover:to-indigo/70 text-white rounded-xl font-semibold shadow-lg shadow-indigo/30 transition-all mt-auto"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </motion.button>
                </form>
              </Form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-sm text-text-light/50"
        >
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <button
                onClick={toggleMode}
                className="text-cyan hover:text-cyan/80 transition-colors font-semibold"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button
                onClick={toggleMode}
                className="text-cyan hover:text-cyan/80 transition-colors font-semibold"
              >
                Sign up
              </button>
            </>
          )}
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-deep-navy flex items-center justify-center">
          <div className="text-text-light">
            This is suspense fallback Loading...
          </div>
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
