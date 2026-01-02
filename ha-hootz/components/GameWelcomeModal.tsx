"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";

interface GameWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string | null;
  hostName: string | null;
  sessionCode: string;
}

export default function GameWelcomeModal({
  isOpen,
  onClose,
  playerName,
  hostName,
  sessionCode,
}: GameWelcomeModalProps) {
  const [countdown, setCountdown] = useState(5);
  const onCloseRef = useRef(onClose);

  // Update ref when onClose changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Auto-close after 5 seconds with countdown
  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      return;
    }

    // Reset countdown when modal opens
    setCountdown(5);

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Use setTimeout to defer the onClose call to avoid setState during render
          setTimeout(() => {
            onCloseRef.current();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Fallback timer to ensure modal closes
    const timer = setTimeout(() => {
      clearInterval(countdownInterval);
      onCloseRef.current();
    }, 5000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(timer);
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Content */}
            <div className="p-8 text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mb-6 flex justify-center"
              >
                <div className="w-20 h-20 rounded-full bg-[#6366F1] flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </motion.div>

              {/* Heading */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-[#0B1020] mb-4"
              >
                Your Game will be
                <br />
                starting shortly!
              </motion.h2>

              {/* Countdown */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mb-4"
              >
                <p className="text-gray-500 mb-2 text-sm">
                  Closing automatically in
                </p>
                <motion.div
                  key={countdown}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl font-bold text-[#22D3EE] mb-1"
                >
                  {countdown}
                </motion.div>
                <p className="text-sm text-gray-400">
                  {countdown === 1 ? "second" : "seconds"}
                </p>
              </motion.div>

              {/* Player Greeting */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-3"
              >
                <p className="text-lg text-gray-600">
                  {playerName ? (
                    <>
                      Hey{" "}
                      <span className="text-[#6366F1] font-semibold">
                        {playerName}
                      </span>
                      !
                    </>
                  ) : (
                    "Welcome!"
                  )}
                </p>
              </motion.div>

              {/* Good Luck Message */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-lg text-gray-800 font-medium mb-2"
              >
                Good luck!
              </motion.p>

              {/* Host Status */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-sm text-gray-500 mb-6"
              >
                {hostName ? (
                  <>
                    <span className="font-semibold text-gray-700">
                      {hostName}
                    </span>{" "}
                    is preparing the first question.
                  </>
                ) : (
                  "The host is preparing the first question."
                )}
              </motion.p>

              {/* Session Code */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mb-6 pt-6 border-t border-gray-200"
              >
                <p className="text-sm text-gray-500 mb-2">Session Code</p>
                <p className="text-2xl font-bold text-[#6366F1] font-mono tracking-wider">
                  {sessionCode}
                </p>
              </motion.div>

              {/* Action Button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="w-full py-4 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-xl font-semibold text-lg shadow-lg shadow-[#6366F1]/30 transition-all"
              >
                Got it!
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
