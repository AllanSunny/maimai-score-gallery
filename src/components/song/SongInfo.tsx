import type { Difficulty } from "../../types";

export interface SongChartSummary {
  difficulty: Difficulty;
  chartType: "DX" | "Standard";
  level: string;
  chartConstant?: number;
  achievement?: number;
}

interface SongInfoProps {
  name: string;
  alternateTitles?: string[];
  charts: SongChartSummary[];
}

const difficultyStyles: Record<Difficulty, string> = {
  BASIC: "border-l-emerald-500",
  ADVANCED: "border-l-amber-400",
  EXPERT: "border-l-red-500",
  MASTER: "border-l-violet-500",
  "Re:MASTER": "border-l-fuchsia-400",
};

export function SongInfo({ name, alternateTitles = [], charts }: SongInfoProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white/60">
      <header className="border-b border-line px-5 py-5 sm:px-6">
        <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
        {alternateTitles.length > 0 && (
          <p className="mt-1 text-sm text-muted">{alternateTitles.join(" · ")}</p>
        )}
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
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">{chart.chartType}</p>
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
