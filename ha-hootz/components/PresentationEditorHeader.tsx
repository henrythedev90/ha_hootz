"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";

interface PresentationEditorHeaderProps {
  saving: boolean;
  isSaved: boolean;
  onSave: () => void;
}

export default function PresentationEditorHeader({
  saving,
  isSaved,
  onSave,
}: PresentationEditorHeaderProps) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-50 border-b border-[#6366F1]/20 bg-[#1A1F35]/80 backdrop-blur-md shadow-lg px-4 lg:px-6 py-3 lg:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 lg:gap-4">
        <div className="flex items-center gap-2 lg:gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/")}
            className="p-2 hover:bg-[#6366F1]/10 rounded-lg transition-colors flex items-center gap-2 text-[#22D3EE]"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden lg:inline">Back to Dashboard</span>
          </motion.button>
        </div>
        <div className="flex items-center gap-2">
          {!saving && isSaved && (
            <span className="text-sm text-[#22C55E] self-center hidden lg:inline">
              ● Autosaved
            </span>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSave}
            disabled={saving}
            className="px-3 lg:px-6 py-2 bg-[#6366F1] hover:bg-[#5558E3] text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
          >
            <Save className="w-4 h-4" />
            <span className="hidden lg:inline">
              {saving ? "Saving..." : "Save Presentation"}
            </span>
            <span className="lg:hidden">{saving ? "Saving..." : "Save"}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
