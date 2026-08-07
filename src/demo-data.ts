import type { Score } from "./types";

export const demoScores: Score[] = [
  {
    id: "demo-1", chartId: null, playedAt: "2026-08-04T19:42:00-04:00", songTitle: "系ぎて", chartType: "DX",
    difficulty: "EXPERT", level: "13+", chartConstant: 13.8, achievement: 100.5079, rank: "SSS+", combo: "FC",
    sync: "FS+", rating: 15149, ratingChange: 11, fast: 4, slow: 9,
    judgments: { criticalPerfect: 834, perfect: 12, great: 1, good: 0, miss: 0 }, judgmentsByType: null,
  },
  {
    id: "demo-2", chartId: null, playedAt: "2026-08-02T15:18:00-04:00", songTitle: "Credits", chartType: "STD",
    difficulty: "MASTER", level: "13", chartConstant: 13.4, achievement: 99.9821, rank: "SSS", combo: "FC+",
    sync: "FS", rating: 15138, ratingChange: 4, fast: 11, slow: 6,
    judgments: { criticalPerfect: 721, perfect: 24, great: 3, good: 0, miss: 0 }, judgmentsByType: null,
  },
  {
    id: "demo-3", chartId: null, playedAt: "2026-07-29T20:06:00-04:00", songTitle: "Glorious Crown", chartType: "DX",
    difficulty: "Re:MASTER", level: "14+", chartConstant: 14.7, achievement: 98.7432, rank: "SS+", combo: "Clear",
    sync: "None", rating: 15134, ratingChange: -2, fast: 18, slow: 23,
    judgments: { criticalPerfect: 948, perfect: 43, great: 12, good: 2, miss: 3 }, judgmentsByType: null,
  },
];
