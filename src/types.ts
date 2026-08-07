export type Difficulty = "BASIC" | "ADVANCED" | "EXPERT" | "MASTER" | "Re:MASTER";
export type ChartType = "DX" | "STD";

export interface Chart {
  id: string;
  difficulty: Difficulty;
  level: string;
  chartConstant: number | null;
}

export interface SongVersion {
  id: string;
  chartType: ChartType;
  charts: Chart[];
}

export interface Song {
  id: string;
  title: string;
  alternateTitles: string[];
  jacketKey: string | null;
  versions: SongVersion[];
}

export interface CatalogSongView extends Omit<Song, "versions">, SongVersion {
  jacketUrl: string | null;
}

export interface UnmatchedSong {
  title: string;
  reason: string;
  firstSeenAt: string;
  lastAttemptedAt: string;
}

export interface GeneratedCatalog {
  generatedAt: string;
  songs: Song[];
  unmatchedSongs: UnmatchedSong[];
}

export interface JudgmentSet {
  criticalPerfect: number;
  perfect: number;
  great: number;
  good: number;
  miss: number;
}

export interface JudgmentBreakdown {
  break: JudgmentSet;
  tap: JudgmentSet;
  hold: JudgmentSet;
  slide: JudgmentSet;
  touch: JudgmentSet;
}

export interface ScoreRecord {
  id: string;
  chartId: string | null;
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
  judgmentsByType: JudgmentBreakdown | null;
}

export type Score = ScoreRecord;

export interface ScoresResponse {
  scores: ScoreRecord[];
  updatedAt: string;
}
