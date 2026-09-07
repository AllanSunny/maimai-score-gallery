import { achievementRank } from "../../utils/rank";
import type { Difficulty, SongSummary } from "../../utils/types";
import { appHref } from "../../utils/navigation";
import { useRef, useState } from "react";
import { ComboDisplay } from "../score/ComboDisplay";
import { RankDisplay } from "../score/RankDisplay";
import { SyncDisplay } from "../score/SyncDisplay";
import { OverflowMarquee } from "../ui/OverflowMarquee";
import dxIcon from "../../assets/icons/dx.png";
import stdIcon from "../../assets/icons/std.png";
import favicon from "../../assets/favicon.png";

const chartTypeIcons = { DX: dxIcon, STD: stdIcon };

const difficultyStyles: Record<Difficulty, string> = {
  BASIC: "border-basic",
  ADVANCED: "border-advanced",
  EXPERT: "border-expert",
  MASTER: "border-master",
  "Re:MASTER": "border-remaster",
};

interface SongInfoProps extends SongSummary {
  expanded: boolean;
  onToggle: (element: HTMLElement) => void;
}

export function SongInfo({ titles, jacketUrl, versions, expanded, onToggle }: SongInfoProps) {
  const articleRef = useRef<HTMLElement>(null);
  const [selectedChartType, setSelectedChartType] = useState(() =>
    versions.some((version) => version.chartType === "DX") ? "DX" : versions[0].chartType,
  );
  const name = titles.canonical;
  const selectedVersion = versions.find((version) => version.chartType === selectedChartType) ?? versions[0];
  function toggleExpanded() {
    if (articleRef.current) onToggle(articleRef.current);
  }

  return (
    <article
      ref={articleRef}
      data-song-key={name}
      data-song-expanded={expanded}
      className={`group relative overflow-hidden rounded-xl border border-primary ${expanded ? "z-30 p-3 col-span-full bg-dark shadow-[0_0px_5px_var(--color-primary)] md:grid md:grid-cols-[15rem_minmax(0,1fr)]" : "bg-darker"}`}
    >
      <button
        type="button"
        disabled={expanded}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Close" : "Open"} ${name} chart summaries`}
        onClick={toggleExpanded}
        className={`relative block w-full overflow-hidden rounded-xl bg-darkest text-left ${expanded ? "mx-auto my-4 !h-[180px] !w-[180px] aspect-square max-h-60 max-w-60 border border-lightest cursor-default md:my-0 md:!h-full md:!w-full md:aspect-auto md:self-center" : "aspect-square cursor-pointer"}`}
        data-song-jacket
      >
        <img
          src={jacketUrl ?? favicon}
          alt=""
          width="240"
          height="240"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(event) => {
            if (event.currentTarget.src !== favicon) event.currentTarget.src = favicon;
          }}
          className={`size-full object-cover ${expanded ? "" : "transition duration-300 group-hover:scale-[1.025] group-focus-within:scale-[1.025]"}`}
        />
        <span className={`absolute inset-x-0 bottom-0 translate-y-full bg-darkest/90 px-3 py-2 text-lightest backdrop-blur-sm ${expanded ? "" : "transition-transform duration-200 group-hover:translate-y-0 group-focus-within:translate-y-0"}`}>
          <OverflowMarquee className="font-semibold" centerWhenFit>{name}</OverflowMarquee>
        </span>
      </button>

      {expanded && <button
        type="button"
        aria-label={`Dismiss ${name} chart summaries`}
        onClick={toggleExpanded}
        className="btn btn-tertiary absolute top-2 right-2 z-10 size-8 !rounded-full !p-0 text-lg leading-none backdrop-blur-sm"
      >
        <span aria-hidden="true">×</span>
      </button>}

      {expanded && <div className="rounded-lg md:flex md:flex-col md:pl-3" aria-label={`${name} chart summaries`}>
        <div className="mb-4 md:mb-2 flex flex-col items-center gap-2 px-10 md:flex-row md:justify-between md:pl-1">
          <div className="flex min-w-0 w-full flex-1 items-center md:items-left justify-center gap-4 md:justify-start">
            <img src={chartTypeIcons[selectedVersion.chartType]} alt={selectedVersion.chartType} className="hidden h-4 w-auto shrink-0 md:block" />
            <OverflowMarquee className="font-semibold text-lightest text-xl md:!text-left" centerWhenFit>{name}</OverflowMarquee>
          </div>
          <div className="flex w-full shrink-0 items-center justify-center gap-3 md:w-auto" aria-label="Chart version">
            <img src={chartTypeIcons[selectedVersion.chartType]} alt={selectedVersion.chartType} className="h-4 w-auto md:hidden" />
            {versions.filter((version) => version.chartType !== selectedVersion.chartType).map((version) =>
              <button
                  key={version.chartType}
                  type="button"
                  aria-label={`Show ${version.chartType} charts`}
                  onClick={() => setSelectedChartType(version.chartType)}
                  className="btn btn-tertiary !rounded-lg !px-2 !py-1"
                >
                  <img src={chartTypeIcons[version.chartType]} alt={version.chartType} className="h-4 w-auto" />
                </button>)}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
        {selectedVersion.charts.map((chart) => {
          const chartRoute = appHref(`/charts/${encodeURIComponent(chart.id)}`);
          const hasStatus = Boolean(chart.bestCombo || chart.bestSync);

          return (
            <a
              key={`${chart.chartType}-${chart.difficulty}`}
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
        })}
        </div>
      </div>}
    </article>
  );
}
