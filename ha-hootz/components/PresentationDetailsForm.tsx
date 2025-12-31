"use client";

import { motion } from "framer-motion";

interface PresentationDetailsFormProps {
  title: string;
  description: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}

export default function PresentationDetailsForm({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: PresentationDetailsFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-2 bg-[#1A1F35] rounded-xl p-6 border border-[#6366F1]/20"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-[#E5E7EB]/80 mb-2">
            Presentation Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-4 py-3 text-[#E5E7EB] placeholder-[#E5E7EB]/30 outline-none transition-all"
            placeholder="Enter presentation title..."
          />
        </div>
        <div>
          <label className="block text-sm text-[#E5E7EB]/80 mb-2">
            Description <span className="text-[#E5E7EB]/40">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-4 py-3 text-[#E5E7EB] placeholder-[#E5E7EB]/30 outline-none transition-all resize-none"
            rows={3}
            placeholder="Enter a description (optional)..."
          />
        </div>
      </div>
    </motion.div>
  );
}

