"use client";

import { useEffect, useState } from "react";

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
  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  // Auto-close after 5 seconds
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      setShowModal(false);
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-[var(--card-bg)] rounded-lg shadow-xl max-w-md w-full p-8 text-center border border-[var(--indigo)]/20">
        <div className="mb-6">
          <div className="w-16 h-16 bg-[var(--indigo)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-[var(--text-light)] mb-2">
            Your Game will be starting shortly!
          </h2>
          <p className="text-[var(--text-light)]/80 text-lg">
            {playerName && (
              <>
                Hey{" "}
                <span className="font-semibold text-[var(--cyan)]">
                  {playerName}
                </span>
                !
              </>
            )}
            {!playerName && "Welcome!"}
          </p>
        </div>

        <div className="mb-6 space-y-3">
          <p className="text-[var(--text-light)]">Good luck!</p>
          <p className="text-sm text-[var(--text-light)]/70">
            {hostName ? (
              <>
                <span className="font-semibold">{hostName}</span> is preparing
                the first question.
              </>
            ) : (
              "The host is preparing the first question."
            )}
          </p>
          <div className="pt-4 border-t border-[var(--indigo)]/20">
            <p className="text-xs text-[var(--text-light)]/60 mb-1">
              Session Code
            </p>
            <p className="text-lg font-mono font-semibold text-[var(--cyan)]">
              {sessionCode}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowModal(false);
            onClose();
          }}
          className="w-full px-6 py-3 bg-[var(--indigo)] text-white rounded-lg hover:bg-[var(--indigo)]/90 transition-colors font-medium"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
