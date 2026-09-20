import type { PlayRatingInput } from "./types";

export type RatingPlate =
  | "base"
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "purple"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "rainbow"
  | "kiwami";

const ratingPlateThresholds = [
  [16_000, "kiwami"],
  [15_000, "rainbow"],
  [14_500, "platinum"],
  [14_000, "gold"],
  [13_000, "silver"],
  [12_000, "bronze"],
  [10_000, "purple"],
  [7_000, "red"],
  [4_000, "orange"],
  [2_000, "green"],
  [1_000, "blue"],
  [0, "base"],
] as const satisfies readonly (readonly [number, RatingPlate])[];

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

/** Selects the current CiRCLE PLUS plate for a total DX rating. */
export function ratingPlateFor(rating: number): RatingPlate {
  if (!Number.isSafeInteger(rating) || rating < 0) {
    throw new RangeError("Rating must be a non-negative safe integer.");
  }

  return ratingPlateThresholds.find(([minimum]) => rating >= minimum)?.[1] ?? "base";
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
