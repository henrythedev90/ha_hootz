"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import Modal from "@/components/Modal";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

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
  const [showEmailVerificationModal, setShowEmailVerificationModal] =
    useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");

  useEffect(() => {
    setIsSignUp(mode === "signup");

    // Handle URL query parameters for verification status
    const verified = searchParams.get("verified");
    const passwordReset = searchParams.get("password_reset");
    const errorParam = searchParams.get("error");

    if (verified === "true") {
      setSuccess("Email verified successfully! You can now sign in.");
      setError("");
    } else if (passwordReset === "true") {
      setSuccess("Password reset successfully! You can now sign in with your new password.");
      setError("");
    } else if (
      errorParam === "invalid_token" ||
      errorParam === "missing_token"
    ) {
      setError(
        "Invalid or expired verification link. Please request a new one.",
      );
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
    setEmailNotVerified(false);
    setUnverifiedEmail("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Check if error is due to unverified email
        // We need to verify credentials first to check verification status
        try {
          const checkResponse = await fetch("/api/auth/check-verification", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: data.email,
              password: data.password,
            }),
          });

          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            if (checkData.exists && !checkData.verified) {
              // Email exists, password is correct, but email is not verified
              setEmailNotVerified(true);
              setUnverifiedEmail(data.email);
              setError("");
              setLoading(false);
              return;
            }
          }
        } catch (checkErr) {
          // If check fails, fall through to generic error
          console.error("Error checking verification:", checkErr);
        }

        // Generic error for invalid credentials or other issues
        setError("Invalid email or password.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: unverifiedEmail,
        }),
      });

      if (response.ok) {
        setSuccess("Verification email sent! Please check your inbox.");
        setEmailNotVerified(false);
      } else {
        setError("Failed to resend verification email. Please try again.");
      }
    } catch (_err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: forgotPasswordEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || "Password reset link sent! Please check your email.");
        setForgotPasswordEmail("");
        setShowForgotPasswordModal(false);
      } else {
        setError(data.error || "Failed to send password reset email. Please try again.");
      }
    } catch {
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

      // Registration successful - show modal about email verification
      // Since registerResponse.ok is true, we know registration succeeded
      setError("");
      signUpForm.reset();
      // Show modal for successful registration
      setShowEmailVerificationModal(true);

      // Don't auto sign in - user must verify email first
      setLoading(false);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    const newMode = isSignUp ? "signin" : "signup";
    router.push(`/auth?mode=${newMode}`);
    setError("");
    setSuccess("");
    setEmailNotVerified(false);
    setUnverifiedEmail("");
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
                  {emailNotVerified && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold mb-1">
                            Email Verification Required
                          </p>
                          <p className="text-sm text-yellow-400/90 mb-3">
                            Your email address has not been verified yet. Please
                            check your inbox and click the verification link to
                            activate your account.
                          </p>
                          <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={loading}
                            className="text-sm font-medium text-yellow-400 hover:text-yellow-300 underline transition-colors disabled:opacity-50"
                          >
                            {loading
                              ? "Sending..."
                              : "Resend verification email"}
                          </button>
                        </div>
                      </div>
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
                      onClick={() => setShowForgotPasswordModal(true)}
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
              Don&apos;t have an account?{" "}
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

      {/* Email Verification Success Modal */}
      <Modal
        isOpen={showEmailVerificationModal}
        onClose={() => setShowEmailVerificationModal(false)}
        title="Congrats! Check Your Email!"
        size="md"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-text-light">
              You&apos;re one step closer to enjoying Ha-Hootz!
            </p>
            <p className="text-text-light/70">
              We&apos;ve sent a verification link to your email address. Please check
              your inbox and click the link to verify your account.
            </p>
            <p className="text-sm text-text-light/60 mt-4">
              Once verified, you&apos;ll be able to sign in and start creating
              amazing trivia presentations!
            </p>
          </div>
          <button
            onClick={() => setShowEmailVerificationModal(false)}
            className="mt-4 w-full py-3 bg-linear-to-r from-indigo to-indigo/80 hover:from-indigo/90 hover:to-indigo/70 text-white rounded-xl font-semibold transition-all"
          >
            Got it!
          </button>
        </div>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotPasswordModal}
        onClose={() => {
          setShowForgotPasswordModal(false);
          setForgotPasswordEmail("");
          setError("");
        }}
        title="Reset Your Password"
        size="md"
      >
        <form onSubmit={handleForgotPassword} className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm"
            >
              {success}
            </motion.div>
          )}
          <div>
            <label className="block text-sm text-text-light/80 mb-2">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light/40" />
              <Input
                type="email"
                autoComplete="email"
                placeholder="Enter your email address"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required
                className="h-12 pl-12 bg-deep-navy/50 border-2 border-indigo/20 focus:border-indigo rounded-xl text-text-light placeholder:text-text-light/30"
              />
            </div>
            <p className="text-xs text-text-light/60 mt-2">
              We&apos;ll send you a link to reset your password.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForgotPasswordModal(false);
                setForgotPasswordEmail("");
                setError("");
              }}
              className="flex-1 py-3 bg-deep-navy/50 hover:bg-deep-navy/70 text-text-light rounded-xl font-semibold transition-all border border-indigo/20"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !forgotPasswordEmail}
              className="flex-1 py-3 bg-linear-to-r from-indigo to-indigo/80 hover:from-indigo/90 hover:to-indigo/70 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </div>
        </form>
      </Modal>
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
