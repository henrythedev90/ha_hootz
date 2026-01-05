"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Loading from "@/components/Loading";
import {
  AvatarSelectionModal,
  Avatar,
} from "@/components/AvatarSelectionModal";

type Step = "code" | "nickname";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const urlSessionCode = params.sessionCode as string;
  const [sessionCode, setSessionCode] = useState(urlSessionCode || "");
  const [nickname, setNickname] = useState("");
  const [step, setStep] = useState<Step>(urlSessionCode ? "nickname" : "code");
  const [loading, setLoading] = useState(!!urlSessionCode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isValidSession, setIsValidSession] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [validatedNickname, setValidatedNickname] = useState("");

  useEffect(() => {
    if (urlSessionCode) {
      validateSession(urlSessionCode);
    }
  }, [urlSessionCode]);

  const validateSession = async (code: string) => {
    try {
      setLoading(true);
      setError("");

      // Validate session code format (6 digits)
      if (!/^\d{6}$/.test(code)) {
        setError("Invalid session code format. Must be 6 digits.");
        setIsValidSession(false);
        setLoading(false);
        return;
      }

      // Check if session code exists and is valid
      const response = await fetch(`/api/sessions/validate/${code}`);
      const data = await response.json();

      if (!response.ok || !data.isValid) {
        setError(
          data.error ||
            "Invalid or expired session code. Please check and try again."
        );
        setIsValidSession(false);
        setLoading(false);
        return;
      }

      // Check if session is locked
      if (data.sessionStatus === "live" || data.sessionStatus === "ended") {
        setIsSessionLocked(true);
        setError("This game has already started. New players cannot join.");
        setIsValidSession(false);
        setLoading(false);
        return;
      }

      setIsValidSession(true);
      setSessionCode(code);
    } catch (err: any) {
      console.error("Error validating session:", err);
      setError("Failed to validate session. Please try again.");
      setIsValidSession(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionCode.length >= 4) {
      await validateSession(sessionCode);
      if (isValidSession || sessionCode.length === 6) {
        // If validation passes or code looks valid, move to next step
        // The validation will set isValidSession
        if (sessionCode.length === 6) {
          await validateSession(sessionCode);
        }
      }
    }
  };

  const handleSubmitNickname = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nickname.trim()) {
      setError("Please enter your nickname");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Check if nickname is already taken
      const checkResponse = await fetch(
        `/api/sessions/${sessionCode}/check-name`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerName: nickname.trim() }),
        }
      );

      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        setError(checkData.error || "Failed to check name availability");
        setSubmitting(false);
        return;
      }

      if (!checkData.isAvailable) {
        setError("This nickname is already taken. Please choose another.");
        setSubmitting(false);
        return;
      }

      // Show avatar selection modal instead of redirecting immediately
      setValidatedNickname(nickname.trim());
      setShowAvatarModal(true);
      setSubmitting(false);
    } catch (err: any) {
      console.error("Error joining game:", err);
      setError("Failed to join game. Please try again.");
      setSubmitting(false);
    }
  };

  const handleAvatarSelect = (avatar: Avatar) => {
    // Redirect to game page with nickname and avatar info
    const avatarParam = encodeURIComponent(JSON.stringify(avatar));
    router.push(
      `/game/${sessionCode}?name=${encodeURIComponent(
        validatedNickname
      )}&avatar=${avatarParam}`
    );
  };

  // Update step when validation completes
  useEffect(() => {
    if (isValidSession && step === "code") {
      setStep("nickname");
    }
  }, [isValidSession, step]);

  if (loading) {
    return <Loading message="Validating session code..." />;
  }

  if (!isValidSession && step === "nickname" && urlSessionCode) {
    // If we have URL code but validation failed, show error
    return (
      <div className="min-h-screen bg-deep-navy text-text-light flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-card-bg rounded-2xl p-8 border-2 border-indigo/30 shadow-xl">
            <h1 className="text-2xl font-bold text-text-light mb-4">
              {isSessionLocked
                ? "Game Already Started"
                : "Invalid Session Code"}
            </h1>
            <p className="text-text-light/70 mb-6">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="w-full px-4 py-2 bg-indigo text-white rounded-md hover:bg-indigo/90 transition-colors font-medium"
            >
              Go to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-navy text-text-light flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-12">
          <motion.h1
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-6xl font-bold mb-4 bg-linear-to-r from-indigo to-cyan bg-clip-text text-transparent"
          >
            Ha-Hootz
          </motion.h1>
          <p className="text-xl text-text-light/70">Join the game!</p>
        </div>

        {/* Form Card */}
        <motion.div
          layout
          className="bg-card-bg rounded-2xl p-8 border-2 border-indigo/30 shadow-xl"
        >
          {step === "code" ? (
            <form onSubmit={handleSubmitCode} className="space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-error/20 border border-error text-error px-4 py-3 rounded-xl text-sm"
                >
                  {error}
                </motion.div>
              )}
              <div>
                <label className="block text-sm text-text-light/70 mb-2">
                  Enter Session Code
                </label>
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setSessionCode(value);
                    setError("");
                  }}
                  className="w-full bg-deep-navy border-2 border-indigo/30 focus:border-indigo rounded-xl px-6 py-4 text-center text-3xl font-mono tracking-widest text-cyan placeholder-text-light/30 outline-none transition-colors"
                  placeholder="123456"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={sessionCode.length < 4 || loading}
                className="w-full py-4 bg-indigo hover:bg-indigo/90 disabled:bg-indigo/30 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <span className="text-lg">Continue</span>
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </form>
          ) : (
            <motion.form
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSubmitNickname}
              className="space-y-6"
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-error/20 border border-error text-error px-4 py-3 rounded-xl text-sm"
                >
                  {error}
                </motion.div>
              )}
              <div>
                <label className="block text-sm text-text-light/70 mb-2">
                  Choose Your Nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setError("");
                  }}
                  className="w-full bg-deep-navy border-2 border-indigo/30 focus:border-indigo rounded-xl px-6 py-4 text-xl text-text-light placeholder-text-light/30 outline-none transition-colors"
                  placeholder="Your name"
                  maxLength={20}
                  autoFocus
                />
                <p className="mt-2 text-sm text-text-light/50">
                  Session:{" "}
                  <span className="text-cyan font-mono">{sessionCode}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("code");
                    setError("");
                  }}
                  className="px-6 py-4 bg-deep-navy border-2 border-indigo/30 hover:border-indigo/50 text-text-light rounded-xl transition-colors"
                >
                  Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={!nickname.trim() || submitting}
                  className="flex-1 py-4 bg-indigo hover:bg-indigo/90 disabled:bg-indigo/30 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="text-lg">
                    {submitting ? "Joining..." : "Join Game"}
                  </span>
                  {!submitting && <ArrowRight className="w-5 h-5" />}
                </motion.button>
              </div>
            </motion.form>
          )}
        </motion.div>

        {/* Friendly Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-text-light/50"
        >
          Get ready for an exciting trivia experience! 🎉
        </motion.p>
      </motion.div>

      {/* Avatar Selection Modal */}
      <AvatarSelectionModal
        isOpen={showAvatarModal}
        playerName={validatedNickname}
        onSelectAvatar={handleAvatarSelect}
      />
    </div>
  );
}
