type AchievementRank =
  | "SSS+"
  | "SSS"
  | "SS+"
  | "SS"
  | "S+"
  | "S"
  | "AAA"
  | "AA"
  | "A"
  | "Failed";

/** Derives a maimai rank from an achievement stored on the 0–101 scale. */
export function achievementRank(achievement: number): AchievementRank {
  if (achievement >= 100.5) return "SSS+";
  if (achievement >= 100) return "SSS";
  if (achievement >= 99.5) return "SS+";
  if (achievement >= 99) return "SS";
  if (achievement >= 98) return "S+";
  if (achievement >= 97) return "S";
  if (achievement >= 94) return "AAA";
  if (achievement >= 90) return "AA";
  if (achievement >= 80) return "A";
  return "Failed";
}
