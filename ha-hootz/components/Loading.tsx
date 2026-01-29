"use client";

import { motion } from "framer-motion";
import { useRef } from "react";

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
  variant?: "dots" | "pulse" | "bars" | "orbit" | "wave";
  size?: "small" | "medium" | "large" | "jumbo";
}

// Available loading variants for random selection
const loadingVariants: Array<"dots" | "pulse" | "bars" | "orbit" | "wave"> = [
  "dots",
  "pulse",
  "bars",
  "orbit",
  "wave",
];

export default function Loading({
  message = "Loading...",
  fullScreen = true,
  variant,
  size = "medium",
}: LoadingProps) {
  // Random loading variant for visual variety (only calculated once per component instance)
  const randomLoadingVariant = useRef(
    loadingVariants[Math.floor(Math.random() * loadingVariants.length)],
  ).current;

  // Use provided variant or fall back to random variant
  const selectedVariant = variant || randomLoadingVariant;
  const containerClasses = fullScreen
    ? "min-h-screen bg-[#0B1020] flex items-center justify-center"
    : "flex items-center justify-center p-8";

  const sizes = {
    small: {
      container: 60,
      dot: 8,
      bar: { width: 4, height: 24 },
      fontSize: "text-sm",
    },
    medium: {
      container: 100,
      dot: 12,
      bar: { width: 6, height: 40 },
      fontSize: "text-base",
    },
    large: {
      container: 140,
      dot: 16,
      bar: { width: 8, height: 56 },
      fontSize: "text-lg",
    },
    jumbo: {
      container: "55vh", // 55% of viewport height
      dot: 24,
      bar: { width: 12, height: 120 },
      fontSize: "text-2xl",
    },
  };

  const currentSize = sizes[size];
  
  // For jumbo size, calculate numeric value for animations (55% of viewport height)
  // Use a reasonable default if window is not available (SSR)
  const getContainerSize = () => {
    if (typeof currentSize.container === "string") {
      // For jumbo, use 55vh which is approximately 55% of viewport height
      // Calculate numeric value for animations: assume typical viewport height of 800px
      if (typeof window !== "undefined") {
        return window.innerHeight * 0.55;
      }
      return 440; // Fallback for SSR
    }
    return currentSize.container;
  };
  
  const containerSize = getContainerSize();
  const containerSizeStyle =
    typeof currentSize.container === "string"
      ? currentSize.container
      : `${currentSize.container}px`;

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center justify-center gap-4">
        <div
          style={{
            width: containerSizeStyle,
            height: containerSizeStyle,
          }}
          className="relative flex items-center justify-center"
        >
          {selectedVariant === "dots" && (
            <DotsAnimation size={{ ...currentSize, container: containerSize }} />
          )}
          {selectedVariant === "pulse" && (
            <PulseAnimation size={{ ...currentSize, container: containerSize }} />
          )}
          {selectedVariant === "bars" && (
            <BarsAnimation size={{ ...currentSize, container: containerSize }} />
          )}
          {selectedVariant === "orbit" && (
            <OrbitAnimation size={{ ...currentSize, container: containerSize }} />
          )}
          {selectedVariant === "wave" && (
            <WaveAnimation size={{ ...currentSize, container: containerSize }} />
          )}
        </div>
        {message && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`${currentSize.fontSize} text-[#E5E7EB]/80 font-medium`}
          >
            {message}
          </motion.p>
        )}
      </div>
    </div>
  );
}

interface SizeProps {
  size: { dot?: number; container?: number | string; bar?: { width: number; height: number } };
}

// Variant 1: Pulsing Dots (Quiz Lights)
function DotsAnimation({ size }: SizeProps) {
  const dotSize = size.dot;
  const colors = ["#6366F1", "#22D3EE", "#F59E0B", "#22C55E", "#A855F7"];

  return (
    <div className="flex items-center justify-center gap-3">
      {colors.map((color, index) => (
        <motion.div
          key={index}
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: color,
          }}
          className="rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
            boxShadow: [
              `0 0 0px ${color}`,
              `0 0 20px ${color}`,
              `0 0 0px ${color}`,
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Variant 2: Pulsing Ring (Thinking/Syncing)
function PulseAnimation({ size }: SizeProps) {
  const containerSize = typeof size.container === "number" ? size.container : parseFloat(size.container) || 440;
  const borderWidth = containerSize > 200 ? 8 : 4;
  
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Outer ring */}
      <motion.div
        className="absolute rounded-full border-[#6366F1]/30"
        style={{
          width: containerSize * 0.9,
          height: containerSize * 0.9,
          borderWidth: `${borderWidth}px`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
          borderColor: [
            "rgba(99, 102, 241, 0.3)",
            "rgba(34, 211, 238, 0.6)",
            "rgba(99, 102, 241, 0.3)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Middle ring */}
      <motion.div
        className="absolute rounded-full border-[#22D3EE]/50"
        style={{
          width: containerSize * 0.6,
          height: containerSize * 0.6,
          borderWidth: `${borderWidth}px`,
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 0.8, 0.5],
          borderColor: [
            "rgba(34, 211, 238, 0.5)",
            "rgba(168, 85, 247, 0.8)",
            "rgba(34, 211, 238, 0.5)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: 0.3,
          ease: "easeInOut",
        }}
      />

      {/* Center question mark */}
      <motion.div
        className={containerSize > 200 ? "text-8xl" : "text-4xl"}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <span className="text-transparent bg-clip-text bg-linear-to-br from-[#6366F1] to-[#22D3EE]">
          ?
        </span>
      </motion.div>
    </div>
  );
}

// Variant 3: Horizontal Bars (Answer Choices Loading)
function BarsAnimation({ size }: SizeProps) {
  const barWidth = size.bar.width;
  const barHeight = size.bar.height;
  const colors = ["#6366F1", "#22D3EE", "#A855F7", "#F59E0B"];

  return (
    <div className="flex items-end justify-center gap-2">
      {colors.map((color, index) => (
        <motion.div
          key={index}
          style={{
            width: barWidth,
            backgroundColor: color,
          }}
          className="rounded-full origin-bottom"
          animate={{
            height: [barHeight * 0.3, barHeight, barHeight * 0.3],
            opacity: [0.5, 1, 0.5],
            boxShadow: [
              `0 0 0px ${color}`,
              `0 0 15px ${color}`,
              `0 0 0px ${color}`,
            ],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: index * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Variant 4: Orbiting Dots (Score Charging)
function OrbitAnimation({ size }: any) {
  const dotSize = size.dot;
  const containerSize = typeof size.container === "number" ? size.container : parseFloat(size.container) || 440;
  const orbitRadius = containerSize * 0.35;
  const colors = ["#6366F1", "#22D3EE", "#F59E0B"];

  return (
    <div className="relative w-full h-full">
      {/* Center glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br from-[#6366F1] to-[#22D3EE]"
        style={{
          width: dotSize * 1.5,
          height: dotSize * 1.5,
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Orbiting dots */}
      {colors.map((color, index) => (
        <motion.div
          key={index}
          className="absolute top-1/2 left-1/2 rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: color,
            boxShadow: `0 0 20px ${color}`,
          }}
          animate={{
            x: [
              Math.cos((index * 2 * Math.PI) / 3) * orbitRadius,
              Math.cos((index * 2 * Math.PI) / 3 + 2 * Math.PI) * orbitRadius,
            ],
            y: [
              Math.sin((index * 2 * Math.PI) / 3) * orbitRadius,
              Math.sin((index * 2 * Math.PI) / 3 + 2 * Math.PI) * orbitRadius,
            ],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

// Variant 5: Wave Animation (Soundwave/Pulse)
function WaveAnimation({ size }: SizeProps) {
  const barWidth = size.bar.width;
  const maxHeight = size.bar.height;
  const bars = 7;
  const colors = ["#6366F1", "#22D3EE", "#A855F7"];

  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: bars }).map((_, index) => {
        const colorIndex = index % colors.length;
        const color = colors[colorIndex];
        const delay = index * 0.1;

        return (
          <motion.div
            key={index}
            style={{
              width: barWidth,
              backgroundColor: color,
            }}
            className="rounded-full"
            animate={{
              height: [
                maxHeight * 0.3,
                maxHeight * (0.6 + Math.sin(index) * 0.4),
                maxHeight * 0.3,
              ],
              opacity: [0.5, 1, 0.5],
              boxShadow: [
                `0 0 0px ${color}`,
                `0 0 12px ${color}`,
                `0 0 0px ${color}`,
              ],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}
