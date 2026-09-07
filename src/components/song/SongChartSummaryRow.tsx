import { achievementRank } from "../../utils/rank";
import { appHref } from "../../utils/navigation";
import type { Difficulty, SongChartSummary } from "../../utils/types";
import { ComboDisplay } from "../score/ComboDisplay";
import { RankDisplay } from "../score/RankDisplay";
import { SyncDisplay } from "../score/SyncDisplay";

const difficultyStyles: Record<Difficulty, string> = {
  BASIC: "border-basic",
  ADVANCED: "border-advanced",
  EXPERT: "border-expert",
  MASTER: "border-master",
  "Re:MASTER": "border-remaster",
};

interface SongChartSummaryRowProps {
  chart: SongChartSummary;
}

export function SongChartSummaryRow({ chart }: SongChartSummaryRowProps) {
  const chartRoute = appHref(`/charts/${encodeURIComponent(chart.id)}`);
  const hasStatus = Boolean(chart.bestCombo || chart.bestSync);

  return (
    <a
      href={chartRoute}
      className={`grid min-h-12 ${hasStatus ? "grid-cols-[minmax(0,1fr)_auto_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto_auto]"} grid-rows-2 items-center gap-x-2 md:gap-x-3 rounded-lg border-l-4 bg-darkest/60 p-3 no-underline ring-1 ring-inset ring-primary/50 transition duration-150 hover:-translate-y-0.5 hover:bg-dark/80 hover:ring-primary/70 hover:shadow-[0_2px_6px_var(--color-darkest)] focus-visible:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${difficultyStyles[chart.difficulty]}`}
    >
      <div className="col-start-1 row-start-1 row-span-2 self-center">
        <p className="min-w-0 truncate text-xs md:text-sm leading-6 font-semibold text-lightest">{chart.difficulty}</p>
        <p className="text-light text-xs md:text-sm">Lv {chart.level}{chart.chartConstant != null && ` · ${chart.chartConstant.toFixed(1)}`}</p>
      </div>

      <div className="col-start-2 row-start-1 row-span-2 self-center">
        <p className="self-end text-xs md:text-sm leading-5 md:leading-6 text-right font-semibold tabular-nums text-lightest">
          {chart.achievement == null ? "" : `${chart.achievement.toFixed(4)}%`}
        </p>
        <RankDisplay
          status={chart.achievement == null ? null : achievementRank(chart.achievement)}
          size="small"
          className="h-4 md:h-5 self-start justify-self-end object-contain object-right"
        />
      </div>

      {hasStatus && <div className="col-start-3 row-span-2 row-start-1 flex items-center justify-end">
        <ComboDisplay status={chart.bestCombo} size="small" className="h-8 md:h-10 max-w-10 object-contain" />
        <SyncDisplay status={chart.bestSync} size="small" className="h-8 md:h-10 max-w-10 object-contain" />
      </div>}
      <span aria-hidden="true" className={`${hasStatus ? "col-start-4" : "col-start-3"} row-span-2 row-start-1 text-sm leading-none text-lightest/60`}>›</span>
    </a>
  );
}
