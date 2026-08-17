export type Difficulty = "BASIC" | "ADVANCED" | "EXPERT" | "MASTER" | "Re:MASTER";
export type ChartType = "DX" | "STD";
export type ComboStatus = "Clear" | "FC" | "FC+" | "AP" | "AP+";
export type SyncStatus = "Sync" | "FS" | "FS+" | "FDX" | "FDX+";

export interface Chart {
  id: string;
  difficulty: Difficulty;
  level: string;
  chartConstant: number | null;
  charter: string | null;
}

export interface SongVersion {
  id: string;
  chartType: ChartType;
  charts: Chart[];
}

export interface SongTitles {
  canonical: string;
  kana: string[];
  romaji: string[];
  english: string[];
  aliases: string[];
}

export interface Song {
  id: string;
  titles: SongTitles;
  artist: string;
  jacketKey: string | null;
  versions: SongVersion[];
}

export interface CatalogSongView extends Omit<Song, "versions">, SongVersion {
  jacketUrl: string | null;
}

export interface GeneratedCatalog {
  generatedAt: string;
  songs: Song[];
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
  chartId: string;
  playedAt: string;
  songTitle: string;
  chartType: ChartType;
  difficulty: Difficulty;
  level: string;
  chartConstant?: number;
  achievement: number;
  combo: ComboStatus;
  sync: SyncStatus | null;
  rating: number;
  ratingChange: number;
  fast: number | null;
  slow: number | null;
  judgments: JudgmentSet | null;
  judgmentsByType: JudgmentBreakdown | null;
}

export type Score = ScoreRecord;

export interface ScoreChunk {
  period: string;
  scores: ScoreRecord[];
}

export interface BestAchievement {
  value: number;
  scoreId: string;
  playedAt: string;
}

export interface BestStatus<T extends string> {
  status: T;
  scoreId: string;
  playedAt: string;
}

export interface ChartRecordSummary {
  chartId: string;
  playCount: number;
  bestAchievement: BestAchievement;
  bestCombo: BestStatus<ComboStatus>;
  bestSync: BestStatus<SyncStatus> | null;
  historyChunks: string[];
}

export interface ChartSummaries {
  generatedAt: string;
  charts: Record<string, ChartRecordSummary>;
}
