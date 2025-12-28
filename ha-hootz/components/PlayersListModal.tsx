"use client";

import { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";

interface Player {
  playerId: string;
  name: string;
}

interface PlayersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCode: string;
  socket: Socket | null;
  connected?: boolean;
}

export default function PlayersListModal({
  isOpen,
  onClose,
  sessionCode,
  socket,
  connected,
}: PlayersListModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number>(5);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownStartTimeRef = useRef<number | null>(null);
  const countdownDurationRef = useRef<number>(5); // 5 seconds
  const hasClosedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // Update onClose ref when it changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Fetch players when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset when modal closes
      setCountdown(0);
      setLoading(true);
      setError("");
      setPlayers([]);
      return;
    }

    const fetchPlayers = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionCode}/players`);
        const data = await response.json();
        if (data.success) {
          setPlayers(data.players);
        } else {
          setError(data.error || "Failed to fetch players");
        }
      } catch (err: any) {
        console.error("Error fetching players:", err);
        setError(err.message || "Failed to fetch players");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [isOpen, sessionCode]);

  // Listen for player join/leave events via socket
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handlePlayerJoined = (data: {
      playerId: string;
      name: string;
      playerCount: number;
    }) => {
      setPlayers((prev) => {
        if (prev.some((p) => p.playerId === data.playerId)) {
          return prev;
        }
        return [...prev, { playerId: data.playerId, name: data.name }];
      });
    };

    const handlePlayerLeft = (data: {
      playerId: string;
      playerCount: number;
    }) => {
      setPlayers((prev) => prev.filter((p) => p.playerId !== data.playerId));
    };

    socket.on("player-joined", handlePlayerJoined);
    socket.on("player-left", handlePlayerLeft);

    return () => {
      socket.off("player-joined", handlePlayerJoined);
      socket.off("player-left", handlePlayerLeft);
    };
  }, [socket, isOpen]);

  // Countdown timer - automatically close after countdown
  // Uses timestamp-based approach for accurate timing
  useEffect(() => {
    if (!isOpen) {
      // Clean up if modal is closed
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      countdownStartTimeRef.current = null;
      hasClosedRef.current = false;
      return;
    }

    // Reset closed flag and initialize when modal opens
    hasClosedRef.current = false;
    countdownDurationRef.current = 5;
    setCountdown(5);

    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Record start time when countdown begins
    const startTime = Date.now();
    countdownStartTimeRef.current = startTime;
    const durationMs = 5000; // 5 seconds in milliseconds

    // Update countdown based on elapsed time (more accurate than interval-based)
    const updateCountdown = () => {
      if (hasClosedRef.current || !countdownStartTimeRef.current) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        return;
      }

      const elapsed = Date.now() - countdownStartTimeRef.current;
      const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));

      setCountdown(remaining);

      if (remaining <= 0) {
        if (!hasClosedRef.current) {
          hasClosedRef.current = true;
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          onCloseRef.current();
        }
      }
    };

    // Update immediately to show initial countdown
    updateCountdown();

    // Update every 100ms for smooth countdown display
    // But calculate based on actual elapsed time for accuracy
    countdownIntervalRef.current = setInterval(updateCountdown, 100);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [isOpen]);

  const handleStartNow = () => {
    if (hasClosedRef.current) return;
    hasClosedRef.current = true;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Players Joined
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Session Code:{" "}
                <span className="font-mono font-semibold">{sessionCode}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {players.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {players.length === 1 ? "Player" : "Players"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                Loading players...
              </p>
            </div>
          ) : error && !players.length ? (
            <div className="text-center py-12">
              <p className="text-red-500 dark:text-red-400">{error}</p>
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No players have joined yet. Waiting for players...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {players.map((player) => (
                <div
                  key={player.playerId}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {player.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        Player ID: {player.playerId.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col items-center space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Starting automatically in
              </p>
              <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                {countdown}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {countdown === 1 ? "second" : "seconds"}
              </p>
            </div>
            <div className="flex space-x-4 w-full max-w-md">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleStartNow}
                disabled={players.length === 0}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
              >
                Start Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
