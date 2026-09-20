import { useState } from "react";
import filterIcon from "../../assets/icons/svg/filter.svg";
import type { ScoreListFilters } from "../../utils/song-list-filter";
import type { ScoreListSort, SortDirection } from "../../utils/song-list-sort";
import { SongFilterPanel } from "./SongFilterPanel";
import { SongSearchInput } from "./SongSearchInput";
import { SongSortControls } from "./SongSortControls";
import { SvgIcon } from "../ui/SvgIcon";

interface SongListControlsProps {
  areFiltersOpen: boolean;
  filters: ScoreListFilters;
  genres: string[];
  levels: string[];
  query: string;
  sort: ScoreListSort;
  sortDirection: SortDirection;
  onFiltersChange: (filters: ScoreListFilters) => void;
  onFiltersOpenChange: (open: boolean) => void;
  onClearFilters: () => void;
  onClearSearch: () => void;
  onSearch: (query: string) => void;
  onSortChange: (sort: ScoreListSort) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
}

export function SongListControls({
  areFiltersOpen,
  filters,
  genres,
  levels,
  query,
  sort,
  sortDirection,
  onFiltersChange,
  onFiltersOpenChange,
  onClearFilters,
  onClearSearch,
  onSearch,
  onSortChange,
  onSortDirectionChange,
}: SongListControlsProps) {
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [isOverflowVisible, setIsOverflowVisible] = useState(areFiltersOpen);

  function toggleFilters() {
    const nextOpen = !areFiltersOpen;

    if (!nextOpen) setIsOverflowVisible(false);
    onFiltersOpenChange(nextOpen);
  }

  return (
    <div className="mt-10 grid items-center gap-x-8 gap-y-3 lg:gap-x-20 song-controls-wide:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex w-full items-center gap-3">
        <SongSearchInput query={query} onChange={onSearch} onClear={onClearSearch} />
        <button
          type="button"
          className="btn btn-primary gap-2"
          aria-expanded={areFiltersOpen}
          aria-controls="score-list-filters"
          onClick={toggleFilters}
        >
          <SvgIcon icon={filterIcon} className="size-4" />
          <p>Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}</p>
        </button>
      </div>

      <SongFilterPanel
        filters={filters}
        genres={genres}
        isOverflowVisible={isOverflowVisible}
        levels={levels}
        onActiveCountChange={setActiveFilterCount}
        onChange={onFiltersChange}
        onClear={onClearFilters}
        onOpenTransitionEnd={() => setIsOverflowVisible(true)}
        open={areFiltersOpen}
      />

      <SongSortControls
        direction={sortDirection}
        onDirectionChange={onSortDirectionChange}
        onSortChange={onSortChange}
        sort={sort}
      />
    </div>
  );
}
