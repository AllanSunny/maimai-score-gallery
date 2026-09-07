import type { RefObject } from "react";
import type { SongSummary } from "../../utils/types";
import { EmptyState } from "../ui/EmptyState";
import { SongInfo } from "./SongInfo";

interface SongGridProps {
  expandedSongKey: string | null;
  gridColumnCount: number;
  gridRef: RefObject<HTMLDivElement | null>;
  hasMoreSongs: boolean;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  onPreservePosition: () => void;
  onSelectSong: (songKey: string) => void;
  songs: SongSummary[];
  totalCount: number;
  visibleCount: number;
}

export function SongGrid({
  expandedSongKey,
  gridColumnCount,
  gridRef,
  hasMoreSongs,
  loadMoreRef,
  onLoadMore,
  onPreservePosition,
  onSelectSong,
  songs,
  totalCount,
  visibleCount,
}: SongGridProps) {
  const selectedSong = songs.find((song) => song.titles.canonical === expandedSongKey);
  const selectedSongIndex = selectedSong ? songs.indexOf(selectedSong) : -1;
  const selectedRowStart = selectedSongIndex < 0
    ? -1
    : Math.floor(selectedSongIndex / gridColumnCount) * gridColumnCount;
  const arrangedSongs = selectedSong
    ? [
        ...songs.slice(0, selectedRowStart),
        selectedSong,
        ...songs.slice(selectedRowStart).filter((song) => song !== selectedSong),
      ]
    : songs;

  return (
    <div
      ref={gridRef}
      className="mt-8 grid grid-cols-[repeat(2,minmax(0,150px))] items-start justify-between gap-y-3 min-[528px]:grid-cols-[repeat(3,minmax(0,150px))] min-[528px]:gap-y-4 min-[688px]:grid-cols-[repeat(4,minmax(0,150px))] min-[848px]:grid-cols-[repeat(5,minmax(0,150px))] min-[1024px]:grid-cols-[repeat(6,minmax(0,150px))]"
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest('a[href*="/charts/"]')) onPreservePosition();
      }}
    >
      {arrangedSongs.map((song) => {
        const songKey = song.titles.canonical;
        return <SongInfo
          key={songKey}
          {...song}
          expanded={expandedSongKey === songKey}
          onToggle={() => onSelectSong(songKey)}
        />;
      })}
      {!totalCount && <EmptyState className="col-span-full rounded-2xl border border-line">No matching songs.</EmptyState>}
      {totalCount > 0 && (
        <div ref={loadMoreRef} className="col-span-full py-4 text-center">
          <p className="mb-3 text-lightest">
            Showing {visibleCount} of {totalCount} songs
          </p>
          {hasMoreSongs && (
            <button type="button" onClick={onLoadMore} className="rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold transition hover:border-coral hover:bg-cream">
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
