"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { ScoringConfig } from "@/types";

interface ScoringConfigurationPanelProps {
  scoringConfig: ScoringConfig;
  onConfigChange: (config: ScoringConfig) => void;
  onShowStreakBonusInfo: () => void;
}

export default function ScoringConfigurationPanel({
  scoringConfig,
  onConfigChange,
  onShowStreakBonusInfo,
}: ScoringConfigurationPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="col-span-2 bg-[#1A1F35] rounded-xl p-6 border border-[#6366F1]/20"
    >
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <span className="text-sm">Scoring</span>
        <Info className="w-4 h-4 text-[#22D3EE]" />
      </h3>

      <div className="space-y-5">
        {/* Base Points */}
        <div>
          <label className="block text-xs text-[#E5E7EB]/80 mb-2">
            Base Points
          </label>
          <input
            type="number"
            min="1"
            value={scoringConfig.basePoints}
            onChange={(e) =>
              onConfigChange({
                ...scoringConfig,
                basePoints: parseInt(e.target.value) || 100,
              })
            }
            className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-3 py-2 text-[#E5E7EB] outline-none transition-all text-sm"
          />
          <p className="mt-1 text-xs text-[#E5E7EB]/50">Per correct answer</p>
        </div>

        {/* Bonus Sections Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Time-Based Bonus */}
          <div className="p-3 bg-[#0B1020]/50 rounded-lg border border-[#6366F1]/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[#E5E7EB]">
                  Time Bonus
                </span>
                <Info className="w-3 h-3 text-[#22D3EE]/60" />
              </div>
              <button
                onClick={() =>
                  onConfigChange({
                    ...scoringConfig,
                    timeBonusEnabled: !scoringConfig.timeBonusEnabled,
                  })
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  scoringConfig.timeBonusEnabled
                    ? "bg-[#22D3EE]"
                    : "bg-[#1A1F35] border-2 border-[#6366F1]/30"
                }`}
              >
                <motion.div
                  animate={{
                    x: scoringConfig.timeBonusEnabled ? 20 : 2,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                />
              </button>
            </div>
            <p className="text-xs text-[#E5E7EB]/60 mb-2">
              Bonus for quick answers
            </p>
            {scoringConfig.timeBonusEnabled && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2"
              >
                <label className="block text-xs text-[#E5E7EB]/80 mb-1">
                  Max Bonus
                </label>
                <input
                  type="number"
                  min="0"
                  value={scoringConfig.maxTimeBonus}
                  onChange={(e) =>
                    onConfigChange({
                      ...scoringConfig,
                      maxTimeBonus: parseInt(e.target.value) || 50,
                    })
                  }
                  className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-3 py-2 text-[#E5E7EB] outline-none transition-all text-sm"
                />
              </motion.div>
            )}
          </div>

          {/* Streak Bonus */}
          <div className="p-3 bg-[#0B1020]/50 rounded-lg border border-[#6366F1]/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[#E5E7EB]">
                  Streak Bonus
                </span>
                <button
                  type="button"
                  onClick={onShowStreakBonusInfo}
                  className="text-[#22D3EE] hover:text-[#22D3EE]/80 transition-colors"
                  title="Learn how Streak Bonus works"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={() =>
                  onConfigChange({
                    ...scoringConfig,
                    streakBonusEnabled: !scoringConfig.streakBonusEnabled,
                  })
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  scoringConfig.streakBonusEnabled
                    ? "bg-[#22D3EE]"
                    : "bg-[#1A1F35] border-2 border-[#6366F1]/30"
                }`}
              >
                <motion.div
                  animate={{
                    x: scoringConfig.streakBonusEnabled ? 20 : 2,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                />
              </button>
            </div>
            <p className="text-xs text-[#E5E7EB]/60 mb-2">
              Bonus for consecutive correct
            </p>
            {scoringConfig.streakBonusEnabled && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 space-y-3"
              >
                <div>
                  <label className="block text-xs text-[#E5E7EB]/80 mb-1">
                    Thresholds
                  </label>
                  <input
                    type="text"
                    value={scoringConfig.streakThresholds.join(", ")}
                    onChange={(e) => {
                      const thresholds = e.target.value
                        .split(",")
                        .map((s) => parseInt(s.trim()))
                        .filter((n) => !isNaN(n) && n > 0);
                      if (thresholds.length > 0) {
                        onConfigChange({
                          ...scoringConfig,
                          streakThresholds: thresholds,
                          // Adjust bonus values array length if needed
                          streakBonusValues:
                            thresholds.length ===
                            scoringConfig.streakBonusValues.length
                              ? scoringConfig.streakBonusValues
                              : thresholds.map(
                                  (_, i) =>
                                    scoringConfig.streakBonusValues[i] || 10
                                ),
                        });
                      }
                    }}
                    placeholder="3, 5, 7"
                    className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-3 py-2 text-[#E5E7EB] placeholder-[#E5E7EB]/30 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#E5E7EB]/80 mb-1">
                    Bonus Values
                  </label>
                  <input
                    type="text"
                    value={scoringConfig.streakBonusValues.join(", ")}
                    onChange={(e) => {
                      const values = e.target.value
                        .split(",")
                        .map((s) => parseInt(s.trim()))
                        .filter((n) => !isNaN(n) && n >= 0);
                      if (
                        values.length > 0 &&
                        values.length === scoringConfig.streakThresholds.length
                      ) {
                        onConfigChange({
                          ...scoringConfig,
                          streakBonusValues: values,
                        });
                      }
                    }}
                    placeholder="10, 25, 50"
                    className="w-full bg-[#0B1020] border-2 border-[#6366F1]/30 focus:border-[#6366F1] rounded-lg px-3 py-2 text-[#E5E7EB] placeholder-[#E5E7EB]/30 outline-none transition-all text-sm"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

