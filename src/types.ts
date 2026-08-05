export type Difficulty = "BASIC" | "ADVANCED" | "EXPERT" | "MASTER" | "Re:MASTER";
export type ChartType = "DX" | "STD";

export interface CatalogChart {
  chartType: ChartType;
  difficulty: Difficulty;
  level: string;
  chartConstant: number | null;
}

export interface CatalogSong {
  id: string;
  title: string;
  alternateTitles: string[];
  jacketUrl: string | null;
  charts: CatalogChart[];
}

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
  chartType: ChartType;
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
