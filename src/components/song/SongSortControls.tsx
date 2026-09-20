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

function directionLabel(sort: ScoreListSort, direction: SortDirection) {
  const ascending = direction === "asc";

  switch (sort) {
    case "title-english":
      return ascending ? "A–Z" : "Z–A";
    case "title-japanese":
      return ascending ? "あ–ん" : "ん–あ";
    case "recent":
      return ascending ? "Oldest first" : "Newest first";
    default:
      return ascending ? "Lowest first" : "Highest first";
  }
}

function arrowPointsDown(sort: ScoreListSort, direction: SortDirection) {
  const titleSort = sort === "title-english" || sort === "title-japanese";
  return titleSort ? direction === "asc" : direction === "desc";
}

function isTitleSort(sort: ScoreListSort) {
  return sort === "title-english" || sort === "title-japanese";
}

export function SongSortControls({
  direction,
  onDirectionChange,
  onSortChange,
  sort,
}: SongSortControlsProps) {
  const currentDirectionLabel = directionLabel(sort, direction);
  const pointsDown = arrowPointsDown(sort, direction);

  return (
    <div className="flex w-fit items-center justify-self-end gap-3 song-controls-wide:col-start-2 song-controls-wide:row-start-1">
      <span className="text-light">Sort by</span>
      <DropdownSelector
        align="right"
        label="Sort songs"
        options={scoreListSortOptions}
        value={sort}
        triggerClassName="w-48 justify-between"
        onChange={(nextSort) => {
          onSortChange(nextSort);
          if (isTitleSort(sort) !== isTitleSort(nextSort)) {
            onDirectionChange(direction === "asc" ? "desc" : "asc");
          }
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
