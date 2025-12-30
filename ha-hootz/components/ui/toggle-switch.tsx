"use client";

import { motion } from "framer-motion";
import { cn } from "./utils";

interface ToggleSwitchProps {
  active: boolean;
  onToggle: () => void;
  className?: string;
  leftLabel?: string;
  rightLabel?: string;
}

export function ToggleSwitch({
  active,
  onToggle,
  className,
  leftLabel,
  rightLabel,
}: ToggleSwitchProps) {
  const switchVariants = {
    initial: {
      backgroundColor: "#1a1f35",
    },
    animate: {
      backgroundColor: active ? "#6366f1" : "#1a1f35",
    },
  };

  const handleVariants = {
    initial: {
      x: 0,
    },
    animate: {
      x: active ? 86 : 0,
    },
  };

  const leftLabelVariants = {
    initial: {
      opacity: 1,
    },
    animate: {
      opacity: active ? 0 : 1,
    },
  };

  const rightLabelVariants = {
    initial: {
      opacity: 0,
    },
    animate: {
      opacity: active ? 1 : 0,
    },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      onClick={onToggle}
      variants={switchVariants}
      className={cn(
        "relative w-[110px] h-[30px] rounded-[20px] cursor-pointer flex items-center px-1 overflow-hidden",
        className
      )}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      {/* Left Label */}
      {leftLabel && (
        <motion.span
          variants={leftLabelVariants}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-medium text-white whitespace-nowrap z-10 pointer-events-none"
          style={{ left: "25%" }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {leftLabel}
        </motion.span>
      )}

      {/* Right Label */}
      {rightLabel && (
        <motion.span
          variants={rightLabelVariants}
          className="absolute right-1/2 top-1/2 translate-x-1/2 -translate-y-1/2 text-[11px] font-medium text-white whitespace-nowrap z-10 pointer-events-none"
          style={{ right: "25%" }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {rightLabel}
        </motion.span>
      )}

      {/* Handle */}
      <motion.div
        variants={handleVariants}
        className="relative bg-white w-[22px] h-[22px] rounded-full shadow-md z-20"
        transition={{ duration: 0.2, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
