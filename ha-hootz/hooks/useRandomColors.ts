import { useState, useEffect } from "react";

interface ColorData {
  color: string;
  rgba: string;
}

const COLOR_PALETTE = [
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
 * Generic hook to generate random colors for items
 * @param items - Array of items with unique identifiers
 * @param options - Configuration options
 * @returns Record mapping item identifiers to color data
 */
export function useRandomColors<T extends { id: string }>(
  items: T[],
  options?: {
    palette?: string[];
    shuffle?: boolean;
    opacity?: number;
  }
) {
  const palette = options?.palette || COLOR_PALETTE;
  const shouldShuffle = options?.shuffle ?? false;
  const opacity = options?.opacity ?? 0.3;

  const [colors, setColors] = useState<Record<string, ColorData>>({});

  useEffect(() => {
    const id = setTimeout(() => {
      setColors((prevColors) => {
        const newColors: Record<string, ColorData> = { ...prevColors };

        // Get items that don't have colors yet
        const itemsNeedingColors = items.filter(
          (item) => !newColors[item.id]
        );

        if (itemsNeedingColors.length === 0) {
          return prevColors;
        }

        // If shuffle is enabled, shuffle the palette and assign in order
        // Otherwise, randomly pick colors for each item
        let availableColors = [...palette];
        if (shouldShuffle) {
          availableColors = [...palette].sort(() => Math.random() - 0.5);
        }

        itemsNeedingColors.forEach((item, index) => {
        let hexColor: string;
        if (shouldShuffle) {
          // Use colors in shuffled order
          hexColor = availableColors[index % availableColors.length];
        } else {
          // Randomly pick a color
          hexColor =
            availableColors[
              Math.floor(Math.random() * availableColors.length)
            ];
        }

        // Convert hex to rgba for glow effect
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        newColors[item.id] = {
          color: hexColor,
          rgba: `rgba(${r},${g},${b},${opacity})`,
        };
      });

      return newColors;
    });
    }, 0);
    return () => clearTimeout(id);
  }, [items, palette, shouldShuffle, opacity]);

  return colors;
}

