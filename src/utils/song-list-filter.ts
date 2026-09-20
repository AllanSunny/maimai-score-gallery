import type { ComboStatus, Difficulty, SongChartSummary, SongSummary, SyncStatus } from "./types";

export interface ScoreListFilters {
  combos: Array<ComboStatus | null>;
  syncs: Array<SyncStatus | null>;
  difficulties: Difficulty[];
  genres: string[];
  levels: string[];
  playedOnly: boolean;
}

export type MultiSelectFilterKey = "combos" | "syncs" | "difficulties" | "genres" | "levels";

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
    levels: [...new Set(songs.flatMap((song) => songCharts(song).map((chart) => chart.level)))]
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true })),
  };
}

function songCharts(song: SongSummary): SongChartSummary[] {
  return song.versions.flatMap((version) => version.charts);
}

export function matchingSongCharts(song: SongSummary, filters: ScoreListFilters): SongChartSummary[] {
  return songCharts(song).filter((chart) =>
    (!filters.playedOnly || chart.lastPlayedAt !== null)
    && (!filters.difficulties.length || filters.difficulties.includes(chart.difficulty))
    && (!filters.levels.length || filters.levels.includes(chart.level))
    && (!filters.combos.length || filters.combos.includes(chart.bestCombo ?? null))
    && (!filters.syncs.length || filters.syncs.includes(chart.bestSync ?? null)));
}
