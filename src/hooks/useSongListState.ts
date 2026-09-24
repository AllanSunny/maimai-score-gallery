import { useEffect, useState } from "react";
import { activeScoreListFilterCount, emptyScoreListFilters, type ScoreListFilters } from "../utils/song-list-filter";
import { scoreListSortOptions, type ScoreListSort, type SortDirection } from "../utils/song-list-sort";
import { comboStatuses, difficulties, syncStatuses } from "../utils/types";

interface StoredSongListState {
  areFiltersOpen: boolean;
  filters: ScoreListFilters;
  query: string;
  sort: ScoreListSort;
  sortDirection: SortDirection;
}

const defaultState: StoredSongListState = {
  areFiltersOpen: false,
  filters: emptyScoreListFilters,
  query: "",
  sort: "recent",
  sortDirection: "desc",
};

const sorts = new Set<ScoreListSort>(scoreListSortOptions.map(({ value }) => value));

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function selectedValues<T extends string>(value: unknown, allowedValues: readonly T[]): T[] {
  const allowed = new Set<string>(allowedValues);
  return stringArray(value).filter((item): item is T => allowed.has(item));
}

function nullableSelectedValues<T extends string>(value: unknown, allowedValues: readonly T[]): Array<T | null> {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(allowedValues);
  return value.flatMap((item) => {
    if (item === null) return [null];
    return typeof item === "string" && allowed.has(item) ? [item as T] : [];
  });
}

function readState(storageKey: string): StoredSongListState {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    const filters: ScoreListFilters = {
      combos: nullableSelectedValues(value?.filters?.combos, comboStatuses),
      syncs: nullableSelectedValues(value?.filters?.syncs, syncStatuses),
      difficulties: selectedValues(value?.filters?.difficulties, difficulties),
      genres: stringArray(value?.filters?.genres),
      levels: stringArray(value?.filters?.levels),
      playedOnly: value?.filters?.playedOnly === true,
    };

    return {
      areFiltersOpen: value?.areFiltersOpen === true && activeScoreListFilterCount(filters) > 0,
      filters,
      query: typeof value?.query === "string" ? value.query : "",
      sort: sorts.has(value?.sort) ? value.sort : defaultState.sort,
      sortDirection: value?.sortDirection === "asc" ? "asc" : "desc",
    };
  } catch {
    return defaultState;
  }
}

export function useSongListState(storageKey: string) {
  const [state, setState] = useState(() => readState(storageKey));

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  return {
    ...state,
    setAreFiltersOpen: (areFiltersOpen: boolean) => setState((current) => ({ ...current, areFiltersOpen })),
    setFilters: (filters: ScoreListFilters) => setState((current) => ({ ...current, filters })),
    clearFilters: () => setState((current) => ({ ...current, filters: emptyScoreListFilters })),
    setQuery: (query: string) => setState((current) => ({ ...current, query })),
    clearQuery: () => setState((current) => ({ ...current, query: "" })),
    setSort: (sort: ScoreListSort) => setState((current) => ({ ...current, sort })),
    setSortDirection: (sortDirection: SortDirection) => setState((current) => ({ ...current, sortDirection })),
  };
}
