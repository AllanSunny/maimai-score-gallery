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
    expansionDirection,
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

      <div className="mt-10 max-w-lg">
        <label htmlFor="song-search" className="sr-only">Search by song title</label>
        <span className="relative block">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-darker"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            id="song-search"
            type="search"
            value={pagination.query}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search titles by romaji, english, or kana..."
            className="w-full rounded-xl border border-line bg-white/85 py-3 pr-11 pl-11 text-sm text-dark outline-none transition placeholder:text-darker/60 focus:border-dark focus:ring-3 focus:ring-dark/10 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {pagination.query && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-dark transition hover:bg-dark/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-dark"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="m6 6 12 12" />
                <path d="m18 6-12 12" />
              </svg>
            </button>
          )}
        </span>
      </div>

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
