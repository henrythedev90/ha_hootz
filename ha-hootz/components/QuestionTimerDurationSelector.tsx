"use client";

interface QuestionTimerDurationSelectorProps {
  duration: number;
  onDurationChange: (duration: number) => void;
}

export default function QuestionTimerDurationSelector({
  duration,
  onDurationChange,
}: QuestionTimerDurationSelectorProps) {
  return (
    <div>
      <label className="block text-xs text-[#E5E7EB]/80 mb-2">
        Question Timer Duration
      </label>
      <div className="flex gap-2">
        {[10, 20, 30].map((dur) => (
          <button
            key={dur}
            onClick={() => onDurationChange(dur)}
            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
              duration === dur
                ? "bg-[#6366F1] border-[#6366F1] text-white"
                : "bg-[#0B1020] border-[#6366F1]/30 text-[#E5E7EB] hover:border-[#6366F1]/50"
            }`}
          >
            {dur}s
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-[#E5E7EB]/50">
        Time limit per question
      </p>
    </div>
  );
}

