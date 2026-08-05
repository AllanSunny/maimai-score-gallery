export type Difficulty = "BASIC" | "ADVANCED" | "EXPERT" | "MASTER" | "Re:MASTER";

export interface JudgmentSet {
  criticalPerfect: number;
  perfect: number;
  great: number;
  good: number;
  miss: number;
}

export interface Score {
  id: string;
  playedAt: string;
  songTitle: string;
  alternateTitles?: string[];
  chartType: "DX" | "STD";
  difficulty: Difficulty;
  level: string;
  chartConstant?: number;
  achievement: number;
  rank: string;
  combo: string;
  sync: string;
  rating: number;
  ratingChange: number;
  fast: number;
  slow: number;
  judgments: JudgmentSet;
}

export interface ScoresResponse {
  scores: Score[];
  updatedAt: string;
}
