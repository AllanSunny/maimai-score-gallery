import { useMemo } from "react";
import { SongGrid } from "../components/song/SongGrid";
import { SongListControls } from "../components/song/SongListControls";
import { PageHeading } from "../components/ui/PageHeading";
import { useExpandableSongGrid } from "../hooks/useExpandableSongGrid";
import { usePersistentPaginatedList } from "../hooks/usePersistentPaginatedList";
import { useSongListState } from "../hooks/useSongListState";
import {
  filterAndSortSongs,
  scoreListFilterOptions,
} from "../utils/score-list";
import { groupScoresBySong } from "../utils/song-summaries";
import { chartSummaries, scores } from "../utils/scores";

const PAGE_SIZE = 30;
const LIST_STATE_KEY = "score-gallery:scores-list-state";
const CONTROLS_STATE_KEY = "score-gallery:scores-controls-state";
const groupedSongs = groupScoresBySong(scores, chartSummaries);
const { genres, levels } = scoreListFilterOptions(groupedSongs);
const matchesSongQuery = (song: (typeof groupedSongs)[number], normalizedQuery: string) =>
  song.searchText.includes(normalizedQuery);

export function ScoreListPage() {
  const listState = useSongListState(CONTROLS_STATE_KEY);
  const {
    expandedSongKey,
    expansionDirection,
    selectSong,
    collapseSong,
  } = useExpandableSongGrid();
  const filteredAndSortedSongs = useMemo(
    () => filterAndSortSongs(groupedSongs, listState.filters, listState.sort, listState.sortDirection),
    [listState.filters, listState.sort, listState.sortDirection],
  );
  const pagination = usePersistentPaginatedList({
    items: filteredAndSortedSongs,
    matchesQuery: matchesSongQuery,
    pageSize: PAGE_SIZE,
    query: listState.query,
    storageKey: LIST_STATE_KEY,
  });
  const songs = pagination.filteredItems;
  const visibleSongs = songs.slice(0, pagination.visibleCount);

  function updateControls(update: () => void) {
    update();
    pagination.resetVisibleCount();
    collapseSong();
  }

  return (
    <div>
      <PageHeading
        title="All records"
        description="Browse every recorded song. Open a jacket to view its charts, then select a difficulty for its complete score history. DX and STD versions can be toggled on the same card."
      />

      <SongListControls
        filters={listState.filters}
        genres={genres}
        levels={levels}
        query={listState.query}
        sort={listState.sort}
        sortDirection={listState.sortDirection}
        onFiltersChange={(filters) => updateControls(() => listState.setFilters(filters))}
        onClearFilters={() => updateControls(listState.clearFilters)}
        onSearch={(query) => updateControls(() => listState.setQuery(query))}
        onClearSearch={() => updateControls(listState.clearQuery)}
        onSortChange={(sort) => updateControls(() => listState.setSort(sort))}
        onSortDirectionChange={(direction) => updateControls(() => listState.setSortDirection(direction))}
      />

      <SongGrid
        expandedSongKey={expandedSongKey}
        expansionDirection={expansionDirection}
        hasMoreSongs={pagination.visibleCount < songs.length}
        loadMoreRef={pagination.loadMoreRef}
        onLoadMore={pagination.loadMore}
        onPreservePosition={pagination.preservePosition}
        onSelectSong={(songKey) => void selectSong(songKey)}
        songs={visibleSongs}
        totalCount={songs.length}
        visibleCount={visibleSongs.length}
      />
    </div>
  );
}
