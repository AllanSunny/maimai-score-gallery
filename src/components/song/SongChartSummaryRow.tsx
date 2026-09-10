import { appHref } from "../../utils/navigation";
import type { Difficulty, SongChartSummary } from "../../utils/types";
import { MiniScoreBreakdown } from "../score/MiniScoreBreakdown";
import { classNames } from "../../utils/class-names";
import { ChevronIcon } from "../ui/ChevronIcon";

const chartRowClassName = [
  "grid min-h-12 grid-cols-[minmax(0,1fr)_auto_auto] grid-rows-2 items-center gap-x-2",
  "rounded-lg border-l-4 bg-darkest/60 p-2 no-underline ring-1 ring-inset ring-primary/50",
  "transition duration-150 sm:p-3 md:gap-x-3",
  "hover:-translate-y-0.5 hover:bg-dark/80 hover:ring-primary/70 hover:shadow-[0_2px_6px_var(--color-darkest)]",
  "focus-visible:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
].join(" ");

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
    <a
      href={chartRoute}
      className={classNames(chartRowClassName, difficultyStyles[chart.difficulty])}
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
      <ChevronIcon className="col-start-3 row-span-2 row-start-1 text-lightest" />
    </a>
  );
}
