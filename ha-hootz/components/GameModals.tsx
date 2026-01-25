"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, useRef } from "react";
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
  const portalContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Only set mounted and portal container on client side
    if (typeof window !== "undefined" && document.body) {
      setMounted(true);
      // Ensure we have a stable reference to the portal container
      portalContainerRef.current = document.body;
    }
  }, []);

  // Portal content - both components are always rendered to maintain stable structure
  // They handle their own visibility internally via isOpen prop
  // Ensure leaderboard is an array (defensive programming)
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
  
  const portalContent = (
    <>
      <WinnerDisplay
        isOpen={showWinnerDisplay && !!playerName && !!playerId}
        playerName={(playerName || "") as string}
        playerId={(playerId || "") as string}
        leaderboard={safeLeaderboard}
      />
      <ThankYouModal
        isOpen={showThankYouModal}
        hostName={hostName}
        playerName={playerName}
        onClose={onCloseThankYou}
      />
    </>
  );

  if (!mounted || !portalContainerRef.current) {
    return null;
  }

  // Render modals in a portal to ensure they're always at the document body level
  // This prevents React reconciliation issues when the component tree changes
  return createPortal(portalContent, portalContainerRef.current);
}
