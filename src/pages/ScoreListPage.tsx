import { SongGrid } from "../components/song/SongGrid";
import { PageHeading } from "../components/ui/PageHeading";
import { useExpandableSongGrid } from "../hooks/useExpandableSongGrid";
import { usePersistentPaginatedList } from "../hooks/usePersistentPaginatedList";
import { allSongTitles } from "../utils/song-titles";
import { groupScoresBySong } from "../utils/song-summaries";
import { chartSummaries, scores } from "../utils/scores";

const PAGE_SIZE = 30;
const LIST_STATE_KEY = "score-gallery:scores-list-state";
const groupedSongs = groupScoresBySong(scores, chartSummaries);
const matchesSongQuery = (song: (typeof groupedSongs)[number], normalizedQuery: string) =>
  allSongTitles(song.titles).join(" ").toLocaleLowerCase().includes(normalizedQuery);

export function ScoreListPage() {
  const {
    expandedSongKey,
    gridColumnCount,
    gridRef,
    selectSong,
    collapseSong,
  } = useExpandableSongGrid();
  const pagination = usePersistentPaginatedList({
    items: groupedSongs,
    matchesQuery: matchesSongQuery,
    pageSize: PAGE_SIZE,
    storageKey: LIST_STATE_KEY,
  });
  const songs = pagination.filteredItems;

  const visibleSongs = songs.slice(0, pagination.visibleCount);

  function handleSearch(query: string) {
    pagination.search(query);
    collapseSong();
  }

  return (
    <div>
      <PageHeading
        title="All records"
        description="Browse every recorded song. Open a jacket to view its charts, then select a difficulty for its complete score history. DX and STD versions can be toggled on the same card."
      />

      <label className="mt-10 block max-w-lg">
        <span className="sr-only">Search by song title</span>
        <input type="search" value={pagination.query} onChange={(event) => handleSearch(event.target.value)} placeholder="Search by song title…" className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition placeholder:text-lightest/70 focus:border-coral focus:ring-3 focus:ring-coral/10" />
      </label>

      <SongGrid
        expandedSongKey={expandedSongKey}
        gridColumnCount={gridColumnCount}
        gridRef={gridRef}
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
