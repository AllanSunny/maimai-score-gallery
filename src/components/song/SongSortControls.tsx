import sortArrowIcon from "../../assets/icons/svg/sort-arrow.svg";
import {
  scoreListSortOptions,
  type ScoreListSort,
  type SortDirection,
} from "../../utils/score-list";
import { DropdownSelector } from "../ui/DropdownSelector";
import { SvgIcon } from "../ui/SvgIcon";

interface SongSortControlsProps {
  direction: SortDirection;
  onDirectionChange: (direction: SortDirection) => void;
  onSortChange: (sort: ScoreListSort) => void;
  sort: ScoreListSort;
}

export function SongSortControls({
  direction,
  onDirectionChange,
  onSortChange,
  sort,
}: SongSortControlsProps) {
  return (
    <div className="flex w-fit items-center justify-self-end gap-3 song-controls-wide:col-start-2 song-controls-wide:row-start-1">
      <span className="text-light">Sort by</span>
      <DropdownSelector
        align="right"
        label="Sort songs"
        options={scoreListSortOptions}
        value={sort}
        triggerClassName="w-48 justify-between"
        onChange={onSortChange}
      />
      <button
        type="button"
        className="btn btn-tertiary h-9 !px-2 !rounded-2xl"
        aria-label={`Sort ${direction === "asc" ? "ascending" : "descending"}`}
        title={`Sort ${direction === "asc" ? "ascending" : "descending"}`}
        onClick={() => onDirectionChange(direction === "asc" ? "desc" : "asc")}
      >
        <SvgIcon
          icon={sortArrowIcon}
          className={`size-5 transition-transform ${direction === "desc" ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}
