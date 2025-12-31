"use client";

import { motion } from "framer-motion";

interface ConfettiEffectProps {
  show: boolean;
  isTie: boolean;
}

export default function ConfettiEffect({ show, isTie }: ConfettiEffectProps) {
  if (!show || isTie) return null;

  const confettiColors = [
    "#FFD700",
    "#22D3EE",
    "#6366F1",
    "#22C55E",
    "#F59E0B",
  ];

  const confetti = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
    x: Math.random() * 100,
  }));

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 10002 }}
    >
      {confetti.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            y: "-10vh",
            x: `${particle.x}vw`,
            opacity: 1,
            rotate: 0,
          }}
          animate={{
            y: "110vh",
            rotate: 360,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            width: "8px",
            height: "8px",
            backgroundColor: particle.color,
            borderRadius: "2px",
            left: 0,
            top: 0,
          }}
        />
      ))}
    </div>
  );
}

