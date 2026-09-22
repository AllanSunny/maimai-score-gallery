import { appHref } from "../../utils/navigation";
import type { Difficulty, SongChartSummary } from "../../utils/types";
import { MiniScoreBreakdown } from "../score/MiniScoreBreakdown";
import { ChevronIcon } from "../ui/ChevronIcon";
import { NavigationCard } from "../ui/NavigationCard";

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
  return (
    <NavigationCard
      href={chartRoute}
      accentClassName={difficultyStyles[chart.difficulty]}
      className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto_auto] grid-rows-2 items-center gap-x-2 p-2 sm:p-3 md:gap-x-3"
    >
      <div className="col-start-1 row-start-1 row-span-2 self-center">
        <p className="min-w-0 truncate text-xs sm:text-sm leading-6 font-semibold text-lightest">{chart.difficulty}</p>
        <p className="text-light text-xs sm:text-sm">Lv {chart.level}{chart.chartConstant != null && ` · ${chart.chartConstant.toFixed(1)}`}</p>
      </div>

      <MiniScoreBreakdown
        achievement={chart.achievement}
        combo={chart.bestCombo}
        sync={chart.bestSync}
        className="col-start-2 row-span-2 row-start-1"
      />
      <ChevronIcon className="col-start-3 row-span-2 row-start-1 text-primary" />
    </NavigationCard>
  );
}
