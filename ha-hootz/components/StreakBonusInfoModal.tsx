"use client";

import Modal from "./Modal";

interface StreakBonusInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StreakBonusInfoModal({
  isOpen,
  onClose,
}: StreakBonusInfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How Streak Bonus Works">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#E5E7EB] mb-2">
            What is Streak Bonus?
          </h3>
          <p className="text-[#E5E7EB]/80 text-sm">
            Streak Bonus rewards players for answering multiple questions
            correctly in a row. The more consecutive correct answers, the bigger
            the bonus!
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-[#E5E7EB] mb-2">
            How to Set It Up
          </h3>
          <div className="space-y-3 text-sm text-[#E5E7EB]/80">
            <div>
              <p className="font-medium mb-1">1. Streak Thresholds:</p>
              <p>
                Enter the number of consecutive correct answers needed to trigger
                each bonus level.
              </p>
              <p className="text-xs text-[#E5E7EB]/50 mt-1">
                Example:{" "}
                <code className="bg-[#0B1020] px-1 rounded">3, 5, 7</code> means
                bonuses at 3, 5, and 7+ consecutive correct answers
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">2. Bonus Values:</p>
              <p>
                Enter the bonus points awarded for each threshold. Must match the
                number of thresholds.
              </p>
              <p className="text-xs text-[#E5E7EB]/50 mt-1">
                Example:{" "}
                <code className="bg-[#0B1020] px-1 rounded">10, 25, 50</code>{" "}
                means 10 points at 3 correct, 25 at 5 correct, 50 at 7+ correct
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#6366F1]/10 border border-[#6366F1]/30 rounded-lg p-4">
          <h4 className="font-semibold text-[#22D3EE] mb-2">
            Example Scenario:
          </h4>
          <ul className="text-sm text-[#E5E7EB]/80 space-y-1 list-disc list-inside">
            <li>
              Thresholds:{" "}
              <code className="bg-[#0B1020] px-1 rounded">3, 5, 7</code>
            </li>
            <li>
              Bonus Values:{" "}
              <code className="bg-[#0B1020] px-1 rounded">10, 25, 50</code>
            </li>
            <li>
              Player answers 3 questions correctly → Gets 10 bonus points
            </li>
            <li>
              Player answers 5 questions correctly → Gets 25 bonus points
            </li>
            <li>
              Player answers 7+ questions correctly → Gets 50 bonus points
            </li>
            <li className="mt-2 font-medium">
              If player gets one wrong, streak resets to 0
            </li>
          </ul>
        </div>

        <div className="bg-[#22D3EE]/10 border border-[#22D3EE]/30 rounded-lg p-3">
          <p className="text-sm text-[#22D3EE]">
            <strong>Tip:</strong> Make sure the number of bonus values matches
            the number of thresholds. For example, if you have 3 thresholds, you
            need 3 bonus values.
          </p>
        </div>
      </div>
    </Modal>
  );
}

