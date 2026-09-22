import { Fragment, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { SongSummary } from "../../utils/types";
import { SongGridItem } from "./SongGridItem";

interface SongGridProps {
  expandedSongKey: string | null;
  expansionDirection: "up" | "down";
  hasMoreSongs: boolean;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  onPreservePosition: () => void;
  onSelectSong: (songKey: string) => void;
  songs: SongSummary[];
  totalCount: number;
  visibleCount: number;
}

function useColumnCount(gridRef: RefObject<HTMLDivElement | null>) {
  const [count, setCount] = useState(2);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateCount = () => {
      const nextCount = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
      setCount((currentCount) => currentCount === nextCount ? currentCount : nextCount);
    };
    const observer = new ResizeObserver(updateCount);
    observer.observe(grid);
    updateCount();

    return () => observer.disconnect();
  }, [gridRef]);

  return count;
}

export function SongGrid({
  expandedSongKey,
  expansionDirection,
  hasMoreSongs,
  loadMoreRef,
  onLoadMore,
  onPreservePosition,
  onSelectSong,
  songs,
  totalCount,
  visibleCount,
}: SongGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const columns = useColumnCount(gridRef);
  const expandedSongIndex = songs.findIndex(({ titles }) => titles.canonical === expandedSongKey);
  const expandedRowStart = expandedSongIndex < 0
    ? -1
    : expandedSongIndex - (expandedSongIndex % columns);
  const expandedRowEnd = expandedSongIndex < 0
    ? -1
    : Math.min(songs.length - 1, expandedSongIndex + columns - 1 - (expandedSongIndex % columns));

  return (
    <div
      ref={gridRef}
      className="song-grid mt-10"
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest('a[href*="/charts/"]')) onPreservePosition();
      }}
    >
      {songs.map((song, index) => {
        const songKey = song.titles.canonical;
        const expanded = expandedSongKey === songKey;

        return <Fragment key={songKey}>
          {expansionDirection === "up" && index === expandedRowStart && expandedSongIndex >= 0 && (
            <SongGridItem
              song={songs[expandedSongIndex]}
              expanded
              onToggle={() => onSelectSong(expandedSongKey!)}
            />
          )}
          {expanded
            ? <div
                aria-hidden="true"
                className="aspect-square"
                data-song-placeholder-key={songKey}
              />
            : <SongGridItem
                song={song}
                expanded={false}
                onToggle={() => onSelectSong(songKey)}
              />}
          {expansionDirection === "down" && index === expandedRowEnd && expandedSongIndex >= 0 && (
            <SongGridItem
              song={songs[expandedSongIndex]}
              expanded
              onToggle={() => onSelectSong(expandedSongKey!)}
            />
          )}
        </Fragment>;
      })}
      <div ref={loadMoreRef} className="col-span-full py-4 text-center">
        {!totalCount ? (
          <p className="text-light">No matching songs.</p>
        ) : (
          <>
            <p className="text-light">
              Showing {visibleCount} of {totalCount} songs
            </p>
            {hasMoreSongs && (
              <button type="button" onClick={onLoadMore} className="btn btn-primary mt-3">
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
