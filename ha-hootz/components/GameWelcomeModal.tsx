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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
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
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to the Game!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            {playerName && (
              <>
                Hey{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {playerName}
                </span>
                !
              </>
            )}
            {!playerName && "Welcome!"}
          </p>
        </div>

        <div className="mb-6 space-y-3">
          <p className="text-gray-700 dark:text-gray-200">
            The game session has started!
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {hostName ? (
              <>
                <span className="font-semibold">{hostName}</span> is preparing
                the first question.
              </>
            ) : (
              "The host is preparing the first question."
            )}
          </p>
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Session Code
            </p>
            <p className="text-lg font-mono font-semibold text-blue-600 dark:text-blue-400">
              {sessionCode}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowModal(false);
            onClose();
          }}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
