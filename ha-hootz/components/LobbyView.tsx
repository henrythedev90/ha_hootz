"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, QrCode, Copy, Check, Shuffle } from "lucide-react";
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

  return (
    <div className="h-screen bg-[#0B1020] text-[#E5E7EB] flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 border-b border-[#6366F1]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#E5E7EB]">
            Host Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#22D3EE] mt-0.5">
            Session:{" "}
            <span className="font-mono font-semibold">{sessionCode}</span>
          </p>
        </div>
        <div
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm ${
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
          <span>{connected ? "Connected" : "Disconnected"}</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-[0.825] grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6 md:p-8 overflow-hidden min-h-0">
        {/* Left Column - Join Instructions */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          {/* Copy Link Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 sm:p-6 shrink-0"
          >
            <p className="text-sm font-semibold text-[#0B1020] mb-3 text-center">
              Copy this link:
            </p>
            <div className="flex flex-row gap-3">
              <div className="flex-3 bg-[#E5E7EB] border border-[#6366F1]/20 rounded-lg px-3 py-2.5 font-mono text-xs text-[#0B1020] overflow-x-auto whitespace-nowrap flex items-center">
                {joinUrl}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCopyLink}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  copied
                    ? "bg-[#22C55E] text-white"
                    : "bg-[#6366F1] hover:bg-[#5558E3] text-white"
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
          </motion.div>

          {/* QR Code and Link Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-3 sm:p-4 flex flex-col shrink-0"
          >
            <div className="flex flex-col items-center justify-center shrink-0">
              {/* QR Code */}
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 text-[#0B1020] mb-3">
                  <QrCode className="w-4 h-4" />
                  <p className="text-sm font-semibold">Scan QR Code to Join</p>
                </div>
                <div className="bg-[#E5E7EB] rounded-lg p-3 sm:p-4">
                  <SessionQRCode
                    sessionCode={sessionCode}
                    joinUrl={joinUrl}
                    variant="minimal"
                  />
                </div>
                <p className="text-xs text-[#0B1020]/60 mt-2">
                  Scan with your phone camera
                </p>
              </div>
            </div>

            {/* Randomize Answer Choices Toggle */}
            <div className="mt-4 pt-4 border-t border-[#0B1020]/10 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Shuffle className="w-4 h-4 text-[#0B1020]/60 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0B1020]">
                      Randomize Answer Choices
                    </p>
                    <p className="text-xs text-[#0B1020]/50">
                      Each player will see answers in a different random order
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onRandomizeAnswersChange(!randomizeAnswers)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                    randomizeAnswers
                      ? "bg-[#6366F1]"
                      : "bg-[#E5E7EB] border border-[#0B1020]/20"
                  }`}
                >
                  <motion.div
                    animate={{
                      x: randomizeAnswers ? 20 : 2,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column - Players List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1A1F35]/50 rounded-xl border border-[#6366F1]/20 flex flex-col overflow-hidden"
        >
          {/* Players Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#6366F1]/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#22D3EE]" />
              <h3 className="text-base sm:text-lg font-semibold">
                Players ({players.length})
              </h3>
            </div>
            {players.length > 0 && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-[#22C55E] rounded-full"
              />
            )}
          </div>

          {/* Players List - Scrollable */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 min-h-0">
            {players.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 sm:py-12">
                <Users className="w-10 h-10 sm:w-12 sm:h-12 text-[#6366F1]/30 mb-3" />
                <p className="text-[#E5E7EB]/60 mb-1">
                  Waiting for players to join...
                </p>
                <p className="text-xs sm:text-sm text-[#E5E7EB]/40">
                  Share the code or QR code with players
                </p>
              </div>
            ) : (
              <div
                className={`grid gap-2 ${
                  players.length > 6 ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                <AnimatePresence>
                  {[...players].reverse().map((player, index) => (
                    <motion.div
                      key={player.playerId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-[#0B1020]/30 rounded-lg border border-[#6366F1]/10 hover:border-[#6366F1]/30 transition-all"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-linear-to-br from-[#6366F1] to-[#22D3EE] flex items-center justify-center text-white font-bold shadow-lg shrink-0">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#E5E7EB] truncate text-sm sm:text-base">
                          {player.name}
                        </p>
                        <p className="text-xs text-[#E5E7EB]/50 font-mono truncate">
                          ID: {player.playerId.substring(0, 8)}...
                        </p>
                      </div>
                      <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse shrink-0" />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Players Footer */}
          {players.length > 0 && (
            <div className="px-4 sm:px-6 py-3 border-t border-[#6366F1]/20 bg-[#6366F1]/5 shrink-0">
              <p className="text-xs text-center text-[#E5E7EB]/60">
                Players are joining in real-time.{" "}
                <span className="text-[#22D3EE] font-semibold">
                  Start the game when ready!
                </span>
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom Action Bar */}
      <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 border-t border-[#6366F1]/10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 shrink-0">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCancelSession}
          className="px-6 sm:px-8 py-2.5 sm:py-3 bg-transparent border-2 border-[#EF4444]/40 hover:border-[#EF4444]/60 hover:bg-[#EF4444]/10 text-[#EF4444] rounded-lg font-semibold transition-all text-sm sm:text-base w-full sm:w-auto"
        >
          Cancel Session
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartGame}
          disabled={!connected || players.length === 0}
          className="px-8 sm:px-12 py-2.5 sm:py-3 bg-linear-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803D] text-white rounded-lg font-semibold shadow-lg shadow-[#22C55E]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm sm:text-base w-full sm:w-auto"
        >
          Start Game
        </motion.button>
      </div>
    </div>
  );
}
