import sortArrowIcon from "../../assets/icons/svg/sort-arrow.svg";
import {
  directionForSortChange,
  scoreListSortOptions,
  sortArrowPointsDown,
  sortDirectionLabel,
  type ScoreListSort,
  type SortDirection,
} from "../../utils/song-list-sort";
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
  const currentDirectionLabel = sortDirectionLabel(sort, direction);
  const pointsDown = sortArrowPointsDown(sort, direction);

  return (
    <div className="flex w-fit items-center justify-self-end gap-3 song-controls-wide:col-start-2 song-controls-wide:row-start-1">
      <span className="text-light leading-4">Sort by</span>
      <DropdownSelector
        align="right"
        label="Sort songs"
        options={scoreListSortOptions}
        value={sort}
        triggerClassName="w-48 justify-between"
        onChange={(nextSort) => {
          onSortChange(nextSort);
          const nextDirection = directionForSortChange(sort, nextSort, direction);
          if (nextDirection !== direction) onDirectionChange(nextDirection);
        }}
      />
      <button
        type="button"
        className="btn btn-tertiary h-9 !px-2 !rounded-2xl"
        aria-label={`Sort: ${currentDirectionLabel}`}
        title={`Sort: ${currentDirectionLabel}`}
        onClick={() => onDirectionChange(direction === "asc" ? "desc" : "asc")}
      >
        <SvgIcon
          icon={sortArrowIcon}
          className={`size-5 transition-transform ${pointsDown ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}
