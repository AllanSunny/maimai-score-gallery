import { useState } from "react";
import filterIcon from "../../assets/icons/filter.svg";
import {
  type ScoreListFilters,
  type ScoreListSort,
  type SortDirection,
} from "../../utils/score-list";
import { SongFilterPanel } from "./SongFilterPanel";
import { SongSearchInput } from "./SongSearchInput";
import { SongSortControls } from "./SongSortControls";

interface SongListControlsProps {
  filters: ScoreListFilters;
  genres: string[];
  levels: string[];
  query: string;
  sort: ScoreListSort;
  sortDirection: SortDirection;
  onFiltersChange: (filters: ScoreListFilters) => void;
  onClearFilters: () => void;
  onClearSearch: () => void;
  onSearch: (query: string) => void;
  onSortChange: (sort: ScoreListSort) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
}

export function SongListControls({
  filters,
  genres,
  levels,
  query,
  sort,
  sortDirection,
  onFiltersChange,
  onClearFilters,
  onClearSearch,
  onSearch,
  onSortChange,
  onSortDirectionChange,
}: SongListControlsProps) {
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  return (
    <div className="mt-10 grid items-center gap-x-8 gap-y-3 lg:gap-x-20 song-controls-wide:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex w-full items-center gap-3">
        <SongSearchInput query={query} onChange={onSearch} onClear={onClearSearch} />
        <button
          type="button"
          className="btn btn-primary gap-2"
          aria-expanded={areFiltersOpen}
          aria-controls="score-list-filters"
          onClick={() => setAreFiltersOpen((open) => !open)}
        >
          <img src={filterIcon} alt="" className="size-4" />
          <p>Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}</p>
        </button>
      </div>

      <SongFilterPanel
        filters={filters}
        genres={genres}
        levels={levels}
        onActiveCountChange={setActiveFilterCount}
        onChange={onFiltersChange}
        onClear={onClearFilters}
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
