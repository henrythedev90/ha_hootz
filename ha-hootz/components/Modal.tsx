"use client";

import { ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  padding?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  padding = "px-6 pb-6",
}: ModalProps) {
  if (!isOpen) {
    return null;
  }

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      onClick={onClose}
      style={{ zIndex: 10000, position: "fixed" }}
    >
      <div
        className={`bg-card-bg rounded-lg shadow-xl w-full mx-4 max-h-[90vh] flex flex-col ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10001, position: "relative" }}
      >
        <div className="flex justify-between items-center mb-4 p-6 pb-4 shrink-0">
          <h2 className="text-2xl font-bold text-text-light">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-light/50 hover:text-text-light transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={`${padding} overflow-y-auto flex-1 min-h-0`}>
          {children}
        </div>
      </div>
    </div>
  );

  // Render modal in a portal to ensure it's at the document body level
  if (typeof window !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
