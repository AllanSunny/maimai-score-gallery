import type { ComboStatus, Difficulty, SongChartSummary, SongSummary, SyncStatus } from "./types";

export type ScoreListSort =
  | "recent"
  | "title-english"
  | "title-japanese"
  | "level"
  | "achievement"
  | "play-count";
export type SortDirection = "asc" | "desc";

export const scoreListSortOptions = [
  { value: "recent", label: "Recently played" },
  { value: "title-english", label: "Title (English order)" },
  { value: "title-japanese", label: "Title (Japanese order)" },
  { value: "level", label: "Level" },
  { value: "achievement", label: "Achievement %" },
  { value: "play-count", label: "Play count" },
] as const satisfies ReadonlyArray<{ value: ScoreListSort; label: string }>;

export interface ScoreListFilters {
  combos: Array<ComboStatus | null>;
  syncs: Array<SyncStatus | null>;
  difficulties: Difficulty[];
  genres: string[];
  levels: string[];
  playedOnly: boolean;
}

export type MultiSelectFilterKey = "combos" | "syncs" | "difficulties" | "genres" | "levels";

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const japaneseCollator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

export const emptyScoreListFilters: ScoreListFilters = {
  combos: [],
  syncs: [],
  difficulties: [],
  genres: [],
  levels: [],
  playedOnly: false,
};

export function updateScoreListFilter<K extends MultiSelectFilterKey>(
  filters: ScoreListFilters,
  key: K,
  values: ScoreListFilters[K],
): ScoreListFilters {
  const next = { ...filters, [key]: values } as ScoreListFilters;
  return next.difficulties.length || next.levels.length
    ? next
    : { ...next, playedOnly: false };
}

export function activeScoreListFilterCount(filters: ScoreListFilters): number {
  return filters.combos.length + filters.syncs.length + filters.difficulties.length
    + filters.genres.length + filters.levels.length + Number(filters.playedOnly);
}

export function supportsPlayedOnlyFilter(filters: ScoreListFilters): boolean {
  return filters.difficulties.length > 0 || filters.levels.length > 0;
}

export function scoreListFilterOptions(songs: SongSummary[]) {
  return {
    genres: [...new Set(songs.flatMap((song) => song.catalogSong?.genre ?? []))].sort(),
    levels: [...new Set(songs.flatMap((song) => charts(song).map((chart) => chart.level)))]
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true })),
  };
}

function charts(song: SongSummary): SongChartSummary[] {
  return song.versions.flatMap((version) => version.charts);
}

function levelValue(level: string): number {
  const match = level.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) + (level.includes("+") ? 0.5 : 0) : -1;
}

function maximumLevel(songCharts: SongChartSummary[]): number {
  return Math.max(...songCharts.map((chart) => chart.chartConstant ?? levelValue(chart.level)));
}

function maximumAchievement(songCharts: SongChartSummary[]): number {
  return Math.max(...songCharts.map((chart) => chart.achievement ?? -1));
}

function playCount(songCharts: SongChartSummary[]): number {
  return songCharts.reduce((total, chart) => total + chart.playCount, 0);
}

function lastPlayedAt(songCharts: SongChartSummary[]): string {
  return songCharts.reduce(
    (latest, chart) => chart.lastPlayedAt && chart.lastPlayedAt > latest ? chart.lastPlayedAt : latest,
    "",
  );
}

function matchingCharts(song: SongSummary, filters: ScoreListFilters): SongChartSummary[] {
  return charts(song).filter((chart) =>
    (!filters.playedOnly || chart.lastPlayedAt !== null)
    && (!filters.difficulties.length || filters.difficulties.includes(chart.difficulty))
    && (!filters.levels.length || filters.levels.includes(chart.level))
    && (!filters.combos.length || filters.combos.includes(chart.bestCombo ?? null))
    && (!filters.syncs.length || filters.syncs.includes(chart.bestSync ?? null)));
}

function englishTitle(song: SongSummary): string {
  return song.titles.english[0] ?? song.titles.romaji[0] ?? song.titles.canonical;
}

function japaneseTitle(song: SongSummary): string {
  return song.titles.kana[0] ?? song.titles.canonical;
}

export function filterAndSortSongs(
  songs: SongSummary[],
  filters: ScoreListFilters,
  sort: ScoreListSort,
  direction: SortDirection,
): SongSummary[] {
  const filteredSongs = songs.flatMap((song) => {
    if (filters.genres.length && (!song.catalogSong || !filters.genres.includes(song.catalogSong.genre))) return [];
    const matchedCharts = matchingCharts(song, filters);
    return matchedCharts.length ? [{ song, matchedCharts }] : [];
  });
  const songsWithSortMetrics = filteredSongs.map(({ song, matchedCharts }) => ({
    song,
    metrics: {
      achievement: maximumAchievement(matchedCharts),
      englishTitle: englishTitle(song),
      japaneseTitle: japaneseTitle(song),
      lastPlayedAt: lastPlayedAt(matchedCharts),
      level: maximumLevel(matchedCharts),
      playCount: playCount(matchedCharts),
    },
  }));

  return songsWithSortMetrics.sort((a, b) => {
    const canonicalFallback = () => collator.compare(a.song.titles.canonical, b.song.titles.canonical);
    let comparison: number;
    switch (sort) {
      case "title-english":
        comparison = collator.compare(a.metrics.englishTitle, b.metrics.englishTitle);
        break;
      case "title-japanese":
        comparison = japaneseCollator.compare(a.metrics.japaneseTitle, b.metrics.japaneseTitle);
        break;
      case "level":
        comparison = a.metrics.level - b.metrics.level
          || a.metrics.achievement - b.metrics.achievement;
        break;
      case "achievement":
        comparison = a.metrics.achievement - b.metrics.achievement
          || a.metrics.level - b.metrics.level;
        break;
      case "play-count":
        comparison = a.metrics.playCount - b.metrics.playCount
          || a.metrics.achievement - b.metrics.achievement;
        break;
      case "recent":
      default:
        comparison = a.metrics.lastPlayedAt.localeCompare(b.metrics.lastPlayedAt);
        break;
    }
    return comparison * (direction === "asc" ? 1 : -1) || canonicalFallback();
  }).map(({ song }) => song);
}
