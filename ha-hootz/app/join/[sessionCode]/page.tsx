"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import CenteredLayout from "@/components/CenteredLayout";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = params.sessionCode as string;
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isValidSession, setIsValidSession] = useState(false);
  const [isSessionLocked, setIsSessionLocked] = useState(false);

  useEffect(() => {
    validateSession();
  }, [sessionCode]);

  const validateSession = async () => {
    try {
      setLoading(true);
      setError("");

      // Validate session code format (6 digits)
      if (!/^\d{6}$/.test(sessionCode)) {
        setError("Invalid session code format. Must be 6 digits.");
        setIsValidSession(false);
        return;
      }

      // Check if session code exists and is valid
      const response = await fetch(`/api/sessions/validate/${sessionCode}`);
      const data = await response.json();

      if (!response.ok || !data.isValid) {
        setError(
          data.error ||
            "Invalid or expired session code. Please check and try again."
        );
        setIsValidSession(false);
        return;
      }

      // Check if session is locked
      if (data.sessionStatus === "live" || data.sessionStatus === "ended") {
        setIsSessionLocked(true);
        setError("This game has already started. New players cannot join.");
        setIsValidSession(false);
        return;
      }

      setIsValidSession(true);
    } catch (err: any) {
      console.error("Error validating session:", err);
      setError("Failed to validate session. Please try again.");
      setIsValidSession(false);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Nickname is required
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

      // Redirect to game page - the game page will handle Socket.io join-session event
      router.push(
        `/game/${sessionCode}?name=${encodeURIComponent(nickname.trim())}`
      );
    } catch (err: any) {
      console.error("Error joining game:", err);
      setError("Failed to join game. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading message="Validating session code..." />;
  }

  if (!isValidSession) {
    return (
      <CenteredLayout>
        <div className="bg-[#1A1F35] rounded-2xl border-2 border-[#6366F1]/30 shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-[#E5E7EB] mb-4">
            {isSessionLocked ? "Game Already Started" : "Invalid Session Code"}
          </h1>
          <p className="text-[#E5E7EB]/70 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full px-4 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-xl transition-colors font-medium"
          >
            Go to Home
          </button>
        </div>
      </CenteredLayout>
    );
  }

  return (
    <CenteredLayout>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-[#6366F1] to-[#22D3EE] bg-clip-text text-transparent">
            Ha-Hootz
          </h1>
          <p className="text-xl text-[#E5E7EB]/70">Join the game!</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#1A1F35] rounded-2xl p-8 border-2 border-[#6366F1]/30 shadow-xl">
          <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2 text-center">
            Join Game
          </h1>
          <p className="text-[#E5E7EB]/60 mb-8 text-center">
            Session:{" "}
            <span className="text-[#22D3EE] font-mono font-semibold">{sessionCode}</span>
          </p>

          {error && (
            <div className="mb-6 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleJoinGame} className="space-y-6">
            <div>
              <label
                htmlFor="nickname"
                className="block text-sm text-[#E5E7EB]/70 mb-2"
              >
                Choose Your Nickname
              </label>
              <input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setError(""); // Clear error when user types
                }}
                className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-xl px-6 py-4 text-xl text-[#E5E7EB] placeholder-[#E5E7EB]/30 outline-none transition-colors"
                placeholder="Your name"
                maxLength={20}
                disabled={submitting}
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !nickname.trim()}
              className="w-full py-4 bg-[#6366F1] hover:bg-[#5558E3] disabled:bg-[#6366F1]/30 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center gap-2 transition-colors text-lg font-medium"
            >
              <span>{submitting ? "Joining..." : "Join Game"}</span>
            </button>
          </form>

          {/* Friendly Message */}
          <p className="text-center mt-8 text-[#E5E7EB]/50">
            Get ready for an exciting trivia experience! 🎉
          </p>
        </div>
      </div>
    </CenteredLayout>
  );
}
