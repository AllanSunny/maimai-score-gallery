import sortArrowIcon from "../../assets/icons/sort-arrow.svg";
import {
  scoreListSortOptions,
  type ScoreListSort,
  type SortDirection,
} from "../../utils/score-list";
import { DropdownSelector } from "../ui/DropdownSelector";

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
        <span
          aria-hidden="true"
          className={`size-5 bg-current transition-transform ${direction === "desc" ? "rotate-180" : ""}`}
          style={{
            maskImage: `url("${sortArrowIcon}")`,
            maskPosition: "center",
            maskRepeat: "no-repeat",
            maskSize: "contain",
            WebkitMaskImage: `url("${sortArrowIcon}")`,
            WebkitMaskPosition: "center",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "contain",
          }}
        />
      </button>
    </div>
  );
}
