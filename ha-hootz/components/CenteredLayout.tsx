"use client";

import { ReactNode } from "react";

interface CenteredLayoutProps {
  children: ReactNode;
  className?: string;
  relative?: boolean;
  flexCol?: boolean;
}

export default function CenteredLayout({
  children,
  className = "",
  relative = false,
  flexCol = false,
}: CenteredLayoutProps) {
  const baseClasses = "min-h-screen bg-gray-50 dark:bg-gray-900 p-4";
  const flexClasses = flexCol
    ? "flex flex-col"
    : "flex items-center justify-center";
  const relativeClass = relative ? "relative" : "";
  const combinedClasses =
    `${baseClasses} ${flexClasses} ${relativeClass} ${className}`.trim();

  return <div className={combinedClasses}>{children}</div>;
}
