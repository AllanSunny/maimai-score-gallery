import { useEffect, useMemo, useRef, useState } from "react";
import { classNames } from "../../utils/class-names";
import {
  activeScoreListFilterCount,
  supportsPlayedOnlyFilter,
  type ScoreListFilters,
  updateScoreListFilter,
} from "../../utils/score-list";
import {
  comboStatuses,
  difficulties,
  syncStatuses,
  type ComboStatus,
  type SyncStatus,
} from "../../utils/types";
import { DropdownSelector, type DropdownSelectorOption } from "../ui/DropdownSelector";

const comboOptions: Array<DropdownSelectorOption<ComboStatus | null>> = [...comboStatuses]
  .reverse().map((value) => ({ value, label: value }));
comboOptions.push({ value: null, label: "None" });
const syncOptions: Array<DropdownSelectorOption<SyncStatus | null>> = [...syncStatuses]
  .reverse().map((value) => ({ value, label: value }));
syncOptions.push({ value: null, label: "None" });
const difficultyOptions = difficulties.map((value) => ({ value, label: value }));

interface SongFilterPanelProps {
  filters: ScoreListFilters;
  genres: string[];
  levels: string[];
  onActiveCountChange: (count: number) => void;
  onChange: (filters: ScoreListFilters) => void;
  onClear: () => void;
  open: boolean;
}

export function SongFilterPanel({
  filters,
  genres,
  levels,
  onActiveCountChange,
  onChange,
  onClear,
  open,
}: SongFilterPanelProps) {
  const [isOverflowVisible, setIsOverflowVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeFilterCount = activeScoreListFilterCount(filters);
  const genreOptions = useMemo(() => genres.map((value) => ({ value, label: value })), [genres]);
  const levelOptions = useMemo(() => levels.map((value) => ({ value, label: value })), [levels]);

  useEffect(() => {
    onActiveCountChange(activeFilterCount);
  }, [activeFilterCount, onActiveCountChange]);

  useEffect(() => {
    if (open) return;
    panelRef.current?.querySelectorAll("details").forEach((details) => {
      details.open = false;
    });
  }, [open]);

  return (
    <div
      id="score-list-filters"
      ref={panelRef}
      className={classNames(
        "grid transition-[grid-template-rows] duration-200 ease-out song-controls-wide:col-span-2 song-controls-wide:row-start-2",
        { when: open, then: "mb-5 grid-rows-[1fr]", else: "grid-rows-[0fr]" },
      )}
      aria-hidden={!open}
      inert={!open}
      onTransitionEnd={(event) => {
        if (event.propertyName !== "grid-template-rows") return;
        setIsOverflowVisible(open);
      }}
    >
      <div className={open && isOverflowVisible ? "overflow-visible" : "overflow-hidden"}>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/60 bg-darker p-3" aria-label="Score list filters">
          <DropdownSelector allowMultiple label="Combo" options={comboOptions} values={filters.combos} onChange={(values) => onChange(updateScoreListFilter(filters, "combos", values))} />
          <DropdownSelector allowMultiple label="Sync" options={syncOptions} values={filters.syncs} onChange={(values) => onChange(updateScoreListFilter(filters, "syncs", values))} />
          <DropdownSelector allowMultiple label="Genre" options={genreOptions} values={filters.genres} onChange={(values) => onChange(updateScoreListFilter(filters, "genres", values))} />
          <DropdownSelector allowMultiple label="Difficulty" options={difficultyOptions} values={filters.difficulties} onChange={(values) => onChange(updateScoreListFilter(filters, "difficulties", values))} />
          <DropdownSelector allowMultiple label="Level" options={levelOptions} values={filters.levels} onChange={(values) => onChange(updateScoreListFilter(filters, "levels", values))} />
          {supportsPlayedOnlyFilter(filters) && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-light">
              <input
                type="checkbox"
                className="cursor-pointer"
                checked={filters.playedOnly}
                onChange={(event) => onChange({ ...filters, playedOnly: event.target.checked })}
              />
              Played only
            </label>
          )}
          {activeFilterCount > 0 && (
            <button type="button" className="btn btn-tertiary !px-3 !py-2 text-sm" onClick={onClear}>
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
