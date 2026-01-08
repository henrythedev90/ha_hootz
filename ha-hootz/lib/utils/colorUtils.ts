interface ColorData {
  color: string;
  rgba: string;
}

const ANSWER_COLOR_PALETTE = [
  "#6366F1",
  "#22D3EE",
  "#F59E0B",
  "#A855F7",
  "#EC4899",
  "#10B981",
  "#8B5CF6",
  "#F97316",
  "#06B6D4",
  "#84CC16",
];

/**
 * Generates shuffled colors for answer options (A, B, C, D)
 * Colors are shuffled and assigned in order to ensure each option gets a unique color
 */
export function generateAnswerColors(
  answerOptions: string[] = ["A", "B", "C", "D"]
): Record<string, ColorData> {
  const shuffledColors = [...ANSWER_COLOR_PALETTE].sort(
    () => Math.random() - 0.5
  );

  const colors: Record<string, ColorData> = {};
  answerOptions.forEach((letter, index) => {
    const hexColor = shuffledColors[index % shuffledColors.length];
    // Convert hex to rgba for glow effect
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    colors[letter] = {
      color: hexColor,
      rgba: `rgba(${r},${g},${b},0.3)`,
    };
  });

  return colors;
}
