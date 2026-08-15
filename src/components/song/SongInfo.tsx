import { achievementRank } from "../../utils/rank";
import { displayedAlternateTitles } from "../../utils/song-titles";
import type { ChartType, Difficulty, SongTitles } from "../../utils/types";

export interface SongChartSummary {
  difficulty: Difficulty;
  chartType: ChartType;
  level: string;
  chartConstant?: number;
  achievement?: number;
}

interface SongInfoProps {
  titles: SongTitles;
  chartType: ChartType;
  jacketUrl?: string | null;
  charts: SongChartSummary[];
}

const difficultyStyles: Record<Difficulty, string> = {
  BASIC: "border-l-emerald-500",
  ADVANCED: "border-l-amber-400",
  EXPERT: "border-l-red-500",
  MASTER: "border-l-violet-500",
  "Re:MASTER": "border-l-fuchsia-400",
};

export function SongInfo({ titles, chartType, jacketUrl, charts }: SongInfoProps) {
  const alternateTitles = displayedAlternateTitles(titles);
  const name = titles.canonical;
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white/60">
      <header className="flex items-center gap-4 border-b border-line px-5 py-5 sm:px-6">
        {jacketUrl && <img src={jacketUrl} alt="" width="64" height="64" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="size-16 rounded-lg object-cover" />}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
          {alternateTitles.length > 0 && (
            <p className="mt-1 text-sm text-muted">{alternateTitles.join(" · ")}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-line bg-cream px-3 py-1 text-xs font-semibold tracking-wider text-muted">
          {chartType}
        </span>
      </header>

      <div className="divide-y divide-line">
        {charts.map((chart) => {
          const chartRoute = `#/songs/${encodeURIComponent(name)}/${encodeURIComponent(chart.chartType)}/${encodeURIComponent(chart.difficulty)}`;

          return (
            <a
              key={`${chart.chartType}-${chart.difficulty}`}
              href={chartRoute}
              className={`group grid grid-cols-[1fr_auto] items-center gap-4 border-l-4 px-4 py-4 transition hover:bg-cream sm:grid-cols-[minmax(9rem,1fr)_8rem_9rem_auto] sm:px-5 ${difficultyStyles[chart.difficulty]}`}
            >
              <div>
                <p className="text-sm font-semibold">{chart.difficulty}</p>
              </div>

              <div className="hidden sm:block">
                <p className="text-xs uppercase tracking-wider text-muted">Level</p>
                <p className="mt-0.5 font-semibold tabular-nums">
                  {chart.level}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {chart.chartConstant && chart.chartConstant.toFixed(1)}
                  </span>
                </p>
              </div>

              <div className="text-right sm:text-left">
                <p className="text-xs uppercase tracking-wider text-muted sm:block">Record</p>
                <p className="mt-0.5 font-semibold tabular-nums">
                  {chart.achievement == null ? "—" : `${chart.achievement.toFixed(4)}%`}
                </p>
                {chart.achievement != null && (
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {achievementRank(chart.achievement)}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted sm:hidden">
                  {chart.chartConstant && chart.chartConstant.toFixed(1)}
                </p>
              </div>

              <span aria-hidden="true" className="hidden text-muted transition-transform group-hover:translate-x-1 group-hover:text-ink sm:block">→</span>
            </a>
          );
        })}
      </div>
    </article>
  );
}
