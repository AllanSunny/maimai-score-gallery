/** Shared catalog, score archive, and derived frontend data structures. */

export type Difficulty = "BASIC" | "ADVANCED" | "EXPERT" | "MASTER" | "Re:MASTER";
export type ChartType = "DX" | "STD";
export type ComboStatus = "FC" | "FC+" | "AP" | "AP+";
export type SyncStatus = "Sync" | "FS" | "FS+" | "FDX" | "FDX+";

export interface Chart {
  id: string;
  difficulty: Difficulty;
  level: string;
  /** null when no chart constant is available. */
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
  genre: string;
  /** Game release that introduced the song; distinct from its DX/STD versions. */
  introducedIn: MaimaiVersion | null;
  /** R2 object key, not a full URL. */
  jacketKey: string | null;
  versions: SongVersion[];
}

export interface MaimaiVersion {
  /** Raw SEGA release code, or null for a named standalone release. */
  code: string | null;
  name: string;
}

/** A DX/STD song version with a browser-derived jacket URL; not persisted. */
export interface CatalogSongView extends Omit<Song, "versions">, SongVersion {
  jacketUrl: string | null;
}

export interface CatalogChartView {
  song: CatalogSongView;
  chart: Chart;
}

export interface GeneratedCatalog {
  generatedAt: string;
  songs: Song[];
}

export interface JudgmentSet {
  /** null when not separately displayed/read; legacy combined counts stay in perfect. */
  criticalPerfect: number | null;
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
  /** Stable play identifier. */
  id: string;
  /** References the stable Chart.id assigned during catalog synchronization. */
  chartId: string;
  /** ISO 8601 capture time. */
  playedAt: string;
  /** Original title reported by OCR or the spreadsheet. */
  songTitle: string;
  chartType: ChartType;
  difficulty: Difficulty;
  level: string;
  chartConstant?: number;
  /** Percentage on the 0–101 scale; rank is derived from this value. */
  achievement: number;
  combo: ComboStatus | null;
  sync: SyncStatus | null;
  rating: number;
  ratingChange: number;
  /** Timing counts are null when unavailable. */
  fast: number | null;
  slow: number | null;
  /** null when no overall judgment counts are known. */
  judgments: JudgmentSet | null;
  judgmentsByType: JudgmentBreakdown | null;
}

export type Score = ScoreRecord;

export interface ScoreChunk {
  /** UTC YYYY-MM, matching the archive filename. */
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

/** Cumulative records with achievement, combo, and sync bests selected independently. */
export interface ChartRecordSummary {
  playCount: number;
  bestAchievement: BestAchievement;
  bestCombo: BestStatus<ComboStatus> | null;
  bestSync: BestStatus<SyncStatus> | null;
  /** UTC YYYY-MM archive periods containing this chart's plays. */
  historyChunks: string[];
}

export interface ChartSummaries {
  generatedAt: string;
  charts: Record<string, ChartRecordSummary>;
}

/** Frontend song-list data, including charts without recorded plays. */
export interface SongChartSummary {
  id: string;
  difficulty: Difficulty;
  chartType: ChartType;
  level: string;
  chartConstant?: number;
  achievement?: number;
  bestCombo?: ComboStatus | null;
  bestSync?: SyncStatus | null;
}

export interface SongVersionSummary {
  chartType: ChartType;
  charts: SongChartSummary[];
}

export interface SongSummary {
  titles: SongTitles;
  jacketUrl?: string | null;
  versions: SongVersionSummary[];
}

/** Rank derived from achievement, never stored on a score record. */
export type AchievementRank =
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

/** Inputs used to calculate the rating contributed by one play. */
export interface PlayRatingInput {
  achievement: number;
  chartConstant: number | null;
  combo?: ComboStatus | null;
}
