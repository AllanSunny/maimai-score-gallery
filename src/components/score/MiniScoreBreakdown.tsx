import { achievementRank } from "../../utils/rank";
import type { ComboStatus, SyncStatus } from "../../utils/types";
import { ComboDisplay } from "./ComboDisplay";
import { RankDisplay } from "./RankDisplay";
import { SyncDisplay } from "./SyncDisplay";

interface MiniScoreBreakdownProps {
  achievement: number | null | undefined;
  combo: ComboStatus | null | undefined;
  sync: SyncStatus | null | undefined;
  className?: string;
}

export function MiniScoreBreakdown({ achievement, combo, sync, className }: MiniScoreBreakdownProps) {
  return (
    <div className={`flex shrink-0 items-center justify-end gap-1 sm:gap-3 ${className ?? ""}`}>
      <div className="text-right">
        <p className="text-xs font-semibold leading-5 tabular-nums text-lightest sm:text-sm sm:leading-6">
          {achievement == null ? "" : `${achievement.toFixed(4)}%`}
        </p>
        <RankDisplay
          status={achievement == null ? null : achievementRank(achievement)}
          size="small"
          className="ml-auto h-4 object-contain object-right md:h-5"
        />
      </div>

      <div className="flex w-16 shrink-0 items-center justify-end sm:w-20">
        <span className="flex w-8 shrink-0 justify-center sm:w-10">
          <ComboDisplay status={combo} size="small" className="h-8 max-w-full object-contain sm:h-10" />
        </span>
        <span className="flex w-8 shrink-0 justify-center sm:w-10">
          <SyncDisplay status={sync} size="small" className="h-8 max-w-full object-contain sm:h-10" />
        </span>
      </div>
    </div>
  );
}
