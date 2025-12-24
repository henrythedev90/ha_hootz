"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { isSessionCodeValid } from "@/lib/redis/triviaRedis";
import Loading from "@/components/Loading";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = params.sessionCode as string;
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    validateSessionCode();
  }, [sessionCode]);

  const validateSessionCode = async () => {
    try {
      setLoading(true);
      setError("");

      // Validate session code format (6 digits)
      if (!/^\d{6}$/.test(sessionCode)) {
        setError("Invalid session code format. Must be 6 digits.");
        setIsValid(false);
        return;
      }

      // Check if session code exists in Redis
      const response = await fetch(`/api/sessions/validate/${sessionCode}`);
      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError(
          data.error ||
            "Session code not found or has expired. Please check and try again."
        );
        setIsValid(false);
        return;
      }

      setIsValid(true);
    } catch (err: any) {
      console.error("Error validating session code:", err);
      setError("Failed to validate session code. Please try again.");
      setIsValid(false);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Please enter a display name");
      return;
    }

    setValidating(true);
    setError("");

    try {
      // Check for duplicate names in session
      const checkResponse = await fetch(
        `/api/sessions/${sessionCode}/check-name`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: displayName.trim() }),
        }
      );

      const checkData = await checkResponse.json();

      if (!checkResponse.ok || checkData.duplicate) {
        setError(
          checkData.error ||
            "This name is already taken in this session. Please choose another."
        );
        setValidating(false);
        return;
      }

      // Redirect to game page with session code and name
      router.push(
        `/game/${sessionCode}?name=${encodeURIComponent(displayName.trim())}`
      );
    } catch (err: any) {
      console.error("Error joining session:", err);
      setError("Failed to join session. Please try again.");
      setValidating(false);
    }
  };

  if (loading) {
    return <Loading message="Validating session code..." />;
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Invalid Session Code
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Join Game
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Enter your display name to join session <strong>{sessionCode}</strong>
        </p>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin}>
          <div className="mb-6">
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter your name"
              maxLength={50}
              disabled={validating}
              autoFocus
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This name will be visible to other players
            </p>
          </div>

          <button
            type="submit"
            disabled={validating || !displayName.trim()}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {validating ? "Joining..." : "Join Game"}
          </button>
        </form>
      </div>
    </div>
  );
}
