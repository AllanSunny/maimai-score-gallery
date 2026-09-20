import { matchingSongCharts, type ScoreListFilters } from "./song-list-filter";
import type { SongChartSummary, SongSummary } from "./types";

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

export function isTitleSort(sort: ScoreListSort) {
  return sort === "title-english" || sort === "title-japanese";
}

export function sortDirectionLabel(sort: ScoreListSort, direction: SortDirection) {
  const ascending = direction === "asc";

  switch (sort) {
    case "title-english":
      return ascending ? "A–Z" : "Z–A";
    case "title-japanese":
      return ascending ? "あ–ん" : "ん–あ";
    case "recent":
      return ascending ? "Oldest first" : "Newest first";
    default:
      return ascending ? "Lowest first" : "Highest first";
  }
}

export function sortArrowPointsDown(sort: ScoreListSort, direction: SortDirection) {
  return isTitleSort(sort) ? direction === "asc" : direction === "desc";
}

export function directionForSortChange(
  currentSort: ScoreListSort,
  nextSort: ScoreListSort,
  direction: SortDirection,
): SortDirection {
  return isTitleSort(currentSort) === isTitleSort(nextSort)
    ? direction
    : direction === "asc" ? "desc" : "asc";
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const japaneseCollator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

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
    const matchedCharts = matchingSongCharts(song, filters);
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
