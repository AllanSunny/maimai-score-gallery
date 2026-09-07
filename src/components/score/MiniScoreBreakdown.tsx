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
    <div className={`flex shrink-0 items-center justify-end gap-2 md:gap-3 ${className ?? ""}`}>
      <div className="text-right">
        <p className="text-xs font-semibold leading-5 tabular-nums text-lightest md:text-sm md:leading-6">
          {achievement == null ? "" : `${achievement.toFixed(4)}%`}
        </p>
        <RankDisplay
          status={achievement == null ? null : achievementRank(achievement)}
          size="small"
          className="ml-auto h-4 object-contain object-right md:h-5"
        />
      </div>

      <div className="flex items-center justify-end">
        <span className="flex w-10 justify-center">
          <ComboDisplay status={combo} size="small" className="h-8 max-w-10 object-contain md:h-10" />
        </span>
        <span className="flex w-10 justify-center">
          <SyncDisplay status={sync} size="small" className="h-8 max-w-10 object-contain md:h-10" />
        </span>
      </div>
    </div>
  );
}
