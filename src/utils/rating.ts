import type { ComboStatus } from "./types";

interface PlayRatingInput {
  achievement: number;
  chartConstant: number | null;
  combo?: ComboStatus | null;
}

const rankCoefficients = [
  [100.5, 22.4],
  [100, 21.6],
  [99.5, 21.1],
  [99, 20.8],
  [98, 20.3],
  [97, 20],
  [94, 16.8],
  [90, 15.2],
  [80, 13.6],
  [75, 12],
  [70, 11.2],
  [60, 9.6],
  [50, 8],
  [0, 5],
] as const;

function rankCoefficient(achievement: number): number {
  return rankCoefficients.find(([minimum]) => achievement >= minimum)?.[1] ?? 0;
}

/** Calculates the CiRCLE/CiRCLE PLUS rating contributed by one chart play. */
export function calculatePlayRating({ achievement, chartConstant, combo }: PlayRatingInput): number | null {
  if (chartConstant == null) return null;
  if (!Number.isFinite(achievement) || achievement < 0) {
    throw new RangeError("Achievement must be a finite non-negative percentage.");
  }
  if (!Number.isFinite(chartConstant) || chartConstant <= 0) {
    throw new RangeError("Chart constant must be a finite positive number or null.");
  }

  const cappedAchievement = Math.min(achievement, 100.5);
  const baseRating = Math.floor(
    chartConstant * (cappedAchievement / 100) * rankCoefficient(cappedAchievement),
  );
  const allPerfectBonus = combo === "AP" || combo === "AP+" ? 1 : 0;

  return baseRating + allPerfectBonus;
}
