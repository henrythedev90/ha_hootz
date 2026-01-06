"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, QrCode, Copy, Check, Shuffle, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { usePlayerColors } from "@/hooks/usePlayerColors";

interface Player {
  playerId: string;
  name: string;
  avatarUrl?: string;
}

interface LobbyViewProps {
  sessionCode: string;
  players: Player[];
  connected: boolean;
  copied: boolean;
  randomizeAnswers: boolean;
  onRandomizeAnswersChange: (value: boolean) => void;
  onCopyLink: () => void;
  onStartGame: () => void;
  onCancelSession: () => void;
}

export default function LobbyView({
  sessionCode,
  players,
  connected,
  copied,
  randomizeAnswers,
  onRandomizeAnswersChange,
  onCopyLink,
  onStartGame,
  onCancelSession,
}: LobbyViewProps) {
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${sessionCode}`
      : `/join/${sessionCode}`;

  const [previousPlayerCount, setPreviousPlayerCount] = useState(
    players.length
  );
  const [shouldPulse, setShouldPulse] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const playerColors = usePlayerColors(players);

  // Pulse animation when player count changes
  useEffect(() => {
    if (players.length > previousPlayerCount) {
      setShouldPulse(true);
      setTimeout(() => setShouldPulse(false), 600);
    }
    setPreviousPlayerCount(players.length);
  }, [players.length, previousPlayerCount]);

  // Fetch QR code for compact display
  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        const response = await fetch(`/api/qr/${sessionCode}`);
        const data = await response.json();
        if (data.qrCode) {
          setQrCodeDataUrl(data.qrCode);
        }
      } catch (error) {
        console.error("Error fetching QR code:", error);
      } finally {
        setQrLoading(false);
      }
    };

    fetchQRCode();
  }, [sessionCode]);

  return (
    <div className="h-screen bg-[#0B1020] text-[#E5E7EB] flex flex-col overflow-hidden">
      {/* Compact Session Info Header */}
      <div className="px-6 py-4 border-b border-[#6366F1]/10 flex items-center justify-between shrink-0">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-[#22D3EE]" />
              <h1 className="text-4xl font-bold text-[#E5E7EB]">
                {players.length === 0
                  ? "Waiting for Players"
                  : "Ready to Start"}
              </h1>
            </div>
            <p className="text-lg text-[#E5E7EB]/70">
              {players.length === 0
                ? "Game starts when host begins"
                : `${players.length} ${
                    players.length === 1 ? "player" : "players"
                  } joined`}
            </p>
          </motion.div>
        </div>

        {/* Connection Status */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
            connected
              ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20"
              : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20"
          }`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? "bg-[#22C55E] animate-pulse" : "bg-[#EF4444]"
            }`}
          />
          <span className="text-xs">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Main Content Area - Single Viewport Grid */}
      <div className="flex-[0.8] grid grid-cols-12 gap-6 px-6 py-5 min-h-0 overflow-hidden">
        {/* Left Side - Session Info & Settings */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 min-h-0 lg:border-r lg:border-[#6366F1] lg:pr-6">
          {/* Session Info Area */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="flex items-center gap-7">
              {/* Session Code */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-sm text-[#E5E7EB]/60 uppercase tracking-wider">
                    Session Code
                  </span>
                  <motion.span
                    className="text-4xl font-mono font-bold text-[#22D3EE]"
                    animate={shouldPulse ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {sessionCode}
                  </motion.span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-14 w-px bg-[#6366F1]/20" />

              {/* QR Code - Medium Size */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <QrCode className="w-5 h-5 text-[#22D3EE] mb-2" />
                  <div className="w-[134px] h-[134px] bg-white rounded-lg p-2.5 flex items-center justify-center">
                    {qrLoading ? (
                      <div className="text-[#0B1020]/40 text-sm">
                        Loading...
                      </div>
                    ) : qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-red-500 text-sm text-center px-2">
                        Failed to load
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-14 w-px bg-[#6366F1]/20" />

              {/* Player Count Indicator */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-sm text-[#E5E7EB]/60 uppercase tracking-wider">
                    Players
                  </span>
                  <motion.div
                    className="flex items-center gap-2"
                    animate={shouldPulse ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Users className="w-6 h-6 text-[#22D3EE]" />
                    <span className="text-3xl font-bold text-[#E5E7EB]">
                      {players.length}
                    </span>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Row - Horizontal */}
          <div className="flex items-center justify-center gap-6 px-4 py-3 border-t border-[#6366F1]/10">
            {/* Randomize Answers Toggle */}
            <div className="flex items-center gap-3">
              <Shuffle className="w-4 h-4 text-[#E5E7EB]/60" />
              <span className="text-sm text-[#E5E7EB]/80">
                Randomize Answers
              </span>
              <button
                onClick={() => onRandomizeAnswersChange(!randomizeAnswers)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  randomizeAnswers
                    ? "bg-linear-to-r from-[#6366F1] to-[#22D3EE]"
                    : "bg-[#E5E7EB]/20 border border-[#6366F1]/30"
                }`}
              >
                <motion.div
                  animate={{
                    x: randomizeAnswers ? 20 : 2,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>

            {/* Copy Link Button */}
            <div className="h-6 w-px bg-[#6366F1]/20" />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCopyLink}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                copied
                  ? "bg-[#22C55E] text-white"
                  : "bg-[#6366F1]/20 hover:bg-[#6366F1]/30 text-[#E5E7EB] border border-[#6366F1]/30"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Right Side - Players Preview */}
        <div className="col-span-12 lg:col-span-6 flex flex-col min-h-0 lg:pl-6">
          <div className="flex items-center gap-2 mb-3 px-2">
            <Users className="w-5 h-5 text-[#22D3EE]" />
            <h2 className="text-lg font-semibold text-[#E5E7EB]">
              Joined Players
            </h2>
            {players.length > 0 && (
              <motion.span
                className="text-sm text-[#E5E7EB]/60"
                animate={shouldPulse ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                ({players.length})
              </motion.span>
            )}
          </div>

          {/* Players Container - Scrollable within container only */}
          <div className="flex-1 overflow-y-auto min-h-0 px-2">
            {players.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <Users className="w-16 h-16 text-[#6366F1]/20 mb-4" />
                <p className="text-[#E5E7EB]/60 mb-1">No players yet</p>
                <p className="text-sm text-[#E5E7EB]/40">
                  Share the session code or QR code
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-4">
                <AnimatePresence>
                  {players.map((player, index) => (
                    <motion.div
                      key={player.playerId}
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -10 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                        delay: index * 0.03,
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-[#1A1F35]/50 rounded-full border transition-all group"
                      style={
                        playerColors[player.playerId]
                          ? {
                              borderColor: playerColors[player.playerId].color,
                              boxShadow: `0 0 20px ${
                                playerColors[player.playerId].rgba
                              }`,
                            }
                          : {
                              borderColor: "#6366F1",
                              boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)",
                            }
                      }
                    >
                      {/* Avatar Pill */}
                      {player.avatarUrl ? (
                        <div
                          className="w-8 h-8 rounded-full overflow-hidden ring-2 shadow-md shrink-0"
                          style={
                            playerColors[player.playerId]
                              ? {
                                  borderColor:
                                    playerColors[player.playerId].color,
                                  boxShadow: `0 0 15px ${
                                    playerColors[player.playerId].rgba
                                  }`,
                                }
                              : {
                                  borderColor: "#6366F1",
                                  boxShadow: "0 0 15px rgba(99, 102, 241, 0.3)",
                                }
                          }
                        >
                          <img
                            src={player.avatarUrl}
                            alt={player.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full bg-linear-to-br from-[#6366F1] to-[#22D3EE] flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0"
                          style={
                            playerColors[player.playerId]
                              ? {
                                  boxShadow: `0 0 15px ${
                                    playerColors[player.playerId].rgba
                                  }`,
                                }
                              : {}
                          }
                        >
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-[#E5E7EB] pr-1">
                        {player.name}
                      </span>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-1.5 h-1.5 bg-[#22C55E] rounded-full"
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Primary Host Action - Start Game Button */}
      <div className="px-6 py-4 border-t border-[#6366F1]/10 flex items-center justify-center gap-4 shrink-0">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCancelSession}
          className="px-6 py-2.5 text-sm font-medium text-[#EF4444] hover:text-[#EF4444]/80 border border-[#EF4444]/30 hover:border-[#EF4444]/50 rounded-lg transition-all"
        >
          Cancel Session
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartGame}
          disabled={!connected || players.length === 0}
          className={`px-12 py-3.5 rounded-lg font-semibold text-lg shadow-lg transition-all ${
            !connected || players.length === 0
              ? "bg-[#E5E7EB]/20 text-[#E5E7EB]/40 cursor-not-allowed"
              : "bg-linear-to-r from-[#6366F1] to-[#22D3EE] text-white hover:shadow-xl hover:shadow-[#6366F1]/30"
          }`}
        >
          Start Game
        </motion.button>
      </div>
    </div>
  );
}
