"use client";

import { ReactNode } from "react";
import { cn } from "./ui/utils";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "min-h-screen" | "h-screen";
  overflow?: "hidden" | "auto" | "visible";
}

export default function Container({
  children,
  className,
  variant = "h-screen",
  overflow = "hidden",
}: ContainerProps) {
  const baseClasses = "bg-[#0B1020] text-[#E5E7EB] flex flex-col px-50";

  const variantClasses = {
    "h-screen": "h-screen",
    "min-h-screen": "min-h-screen",
    default: "",
  };

  const overflowClasses = {
    hidden: "overflow-hidden",
    auto: "overflow-auto",
    visible: "overflow-visible",
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        overflowClasses[overflow],
        className
      )}
    >
      {children}
    </div>
  );
}
