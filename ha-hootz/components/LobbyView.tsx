"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, QrCode, Copy, Check } from "lucide-react";
import SessionQRCode from "./SessionQRCode";

interface Player {
  playerId: string;
  name: string;
}

interface LobbyViewProps {
  sessionCode: string;
  players: Player[];
  connected: boolean;
  copied: boolean;
  onCopyLink: () => void;
  onStartGame: () => void;
  onCancelSession: () => void;
}

export default function LobbyView({
  sessionCode,
  players,
  connected,
  copied,
  onCopyLink,
  onStartGame,
  onCancelSession,
}: LobbyViewProps) {
  return (
    <div className="min-h-screen bg-[#0B1020] text-[#E5E7EB] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-[#E5E7EB]">
              Host Dashboard
            </h1>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                connected
                  ? "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30"
                  : "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  connected ? "bg-[#22C55E] animate-pulse" : "bg-[#EF4444]"
                }`}
              />
              <span>{connected ? "Connected" : "Disconnected"}</span>
            </div>
          </div>
          <p className="text-[#E5E7EB]/60">
            Session:{" "}
            <span className="text-[#22D3EE] font-mono font-semibold">
              {sessionCode}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Join Instructions */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-2xl"
            >
              {/* Join Code Display */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-[#0B1020] mb-4 text-center">
                  Join Code: {sessionCode}
                </h2>
              </div>

              {/* QR Code Section */}
              <div className="mb-8">
                <div className="flex items-center justify-center gap-2 text-[#0B1020] mb-4">
                  <QrCode className="w-5 h-5" />
                  <h3 className="font-semibold">Scan QR Code to Join</h3>
                </div>
                <div className="bg-[#E5E7EB] rounded-xl p-6 flex items-center justify-center">
                  <SessionQRCode
                    sessionCode={sessionCode}
                    joinUrl={`/join/${sessionCode}`}
                    variant="minimal"
                  />
                </div>
                <p className="text-center text-sm text-[#0B1020]/60 mt-4">
                  Scan with your phone camera
                </p>
              </div>

              {/* Copy Link Section */}
              <div className="bg-[#E5E7EB] rounded-xl p-6">
                <p className="text-sm font-semibold text-[#0B1020] mb-3 text-center">
                  Or copy this link:
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white border-2 border-[#6366F1]/30 rounded-lg px-4 py-3 font-mono text-sm text-[#0B1020] overflow-x-auto whitespace-nowrap">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/join/${sessionCode}`
                      : `/join/${sessionCode}`}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onCopyLink}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                      copied
                        ? "bg-[#22C55E] text-white"
                        : "bg-[#6366F1] hover:bg-[#5558E3] text-white"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        <span>Copy</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Players List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1A1F35] rounded-2xl p-6 border border-[#6366F1]/20 h-fit"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <Users className="w-6 h-6 text-[#22D3EE]" />
                <span>Players ({players.length})</span>
              </h3>
              {players.length > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-3 h-3 bg-[#22C55E] rounded-full"
                />
              )}
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {players.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-[#6366F1]/30 mb-4" />
                  <p className="text-[#E5E7EB]/50 mb-2">
                    Waiting for players to join...
                  </p>
                  <p className="text-sm text-[#E5E7EB]/30">
                    Share the code or QR code with players
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {[...players].reverse().map((player, index) => (
                    <motion.div
                      key={player.playerId}
                      initial={{ opacity: 0, x: 50, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -50, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 bg-[#0B1020]/50 rounded-xl border border-[#6366F1]/20 hover:border-[#6366F1]/40 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-linear-to-br from-[#6366F1] to-[#22D3EE] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[#E5E7EB] text-lg">
                          {player.name}
                        </p>
                        <p className="text-sm text-[#E5E7EB]/50 font-mono">
                          Player ID: {player.playerId.substring(0, 8)}...
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {players.length > 0 && (
              <div className="mt-6 p-4 bg-[#6366F1]/10 rounded-lg border border-[#6366F1]/30">
                <p className="text-sm text-[#E5E7EB]/70 text-center">
                  Players are joining in real-time. Start the game when ready!
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Action Buttons - Centered Row */}
        <div className="flex justify-center gap-4 mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartGame}
            disabled={!connected || players.length === 0}
            className="px-8 py-4 bg-linear-to-r from-[#22C55E] to-[#1DB954] hover:from-[#1DB954] hover:to-[#16A34A] text-white rounded-xl font-semibold shadow-lg shadow-[#22C55E]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Game
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCancelSession}
            className="px-8 py-4 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border-2 border-[#EF4444]/30 hover:border-[#EF4444]/50 text-[#EF4444] rounded-xl font-semibold transition-all"
          >
            Cancel Session
          </motion.button>
        </div>
      </div>
    </div>
  );
}
