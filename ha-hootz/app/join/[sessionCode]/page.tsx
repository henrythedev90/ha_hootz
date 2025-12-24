"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Loading from "@/components/Loading";

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {isSessionLocked ? "Game Already Started" : "Invalid Session Code"}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            Join Game
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
            Session:{" "}
            <span className="font-mono font-semibold">{sessionCode}</span>
          </p>

          {error && (
            <div className="mb-6 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleJoinGame} className="space-y-6">
            <div>
              <label
                htmlFor="nickname"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Enter your nickname
              </label>
              <input
                type="text"
                id="nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setError(""); // Clear error when user types
                }}
                className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your nickname"
                maxLength={50}
                disabled={submitting}
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !nickname.trim()}
              className="w-full px-6 py-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
            >
              {submitting ? "Joining..." : "Join Game"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
