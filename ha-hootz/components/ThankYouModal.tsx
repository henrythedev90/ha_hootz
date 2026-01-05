"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

interface ThankYouModalProps {
  isOpen: boolean;
  hostName: string | null;
  playerName: string | null;
  onClose?: () => void;
  onCreateAccount?: () => void;
}

export default function ThankYouModal({
  isOpen,
  hostName,
  playerName,
  onClose,
  onCreateAccount,
}: ThankYouModalProps) {
  const handleCreateAccount = () => {
    if (onCreateAccount) {
      onCreateAccount();
    } else {
      window.location.href = "/auth/signup";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl relative"
          >
            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}

            {/* Content */}
            <div className="p-8 text-center">
              {/* Celebration Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
                className="mb-6 text-7xl"
              >
                🎉
              </motion.div>

              {/* Main Heading */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-bold text-[#0B1020] mb-4"
              >
                Thank You for Playing!
              </motion.h2>

              {/* Thank You Message */}
              {hostName && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-3"
                >
                  <p className="text-lg text-gray-600">
                    Thanks for joining{" "}
                    <span className="text-[#6366F1] font-semibold">
                      {hostName}
                    </span>
                    's trivia event!
                  </p>
                </motion.div>
              )}

              {/* Personal Message */}
              {playerName && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-gray-600 mb-8"
                >
                  We hope you enjoyed playing, {playerName}!
                </motion.p>
              )}

              {/* Call to Action Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-linear-to-br from-[#EFF6FF] to-[#F0F9FF] rounded-2xl p-6 mb-6 border border-[#6366F1]/10"
              >
                <div className="mb-4">
                  <h3 className="text-2xl font-bold text-[#0B1020] mb-3">
                    Want to Host Your Own Event?
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Create your own Ha-Hootz account to start creating engaging
                    presentations and host your own trivia events!
                  </p>
                </div>

                {/* CTA Button */}
                <motion.button
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 20px 40px rgba(99, 102, 241, 0.3)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateAccount}
                  className="w-full py-4 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-xl font-semibold text-lg shadow-lg shadow-[#6366F1]/30 transition-all flex items-center justify-center gap-2"
                >
                  <span>Create Your Account</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </motion.div>

              {/* Skip Option */}
              {onClose && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  onClick={onClose}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Maybe later
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
