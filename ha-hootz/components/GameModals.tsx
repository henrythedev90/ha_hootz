"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import WinnerDisplay from "@/components/WinnerDisplay";
import ThankYouModal from "@/components/ThankYouModal";

interface GameModalsProps {
  showWinnerDisplay: boolean;
  showThankYouModal: boolean;
  playerName: string | null;
  playerId: string | null;
  hostName: string | null;
  leaderboard: Array<{ playerId: string; name: string; score: number }>;
  onCloseThankYou?: () => void;
}

export default function GameModals({
  showWinnerDisplay,
  showThankYouModal,
  playerName,
  playerId,
  hostName,
  leaderboard,
  onCloseThankYou,
}: GameModalsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const modals = (
    <>
      <WinnerDisplay
        key="winner-display"
        isOpen={showWinnerDisplay && !!playerName && !!playerId}
        playerName={(playerName || "") as string}
        playerId={(playerId || "") as string}
        leaderboard={leaderboard}
      />
      <ThankYouModal
        key="thank-you-modal"
        isOpen={showThankYouModal}
        hostName={hostName}
        playerName={playerName}
        onClose={onCloseThankYou}
      />
    </>
  );

  // Render modals in a portal to ensure they're always at the document body level
  // This prevents React reconciliation issues when the component tree changes
  return createPortal(modals, document.body);
}
