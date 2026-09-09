import { useEffect, useRef, useState } from "react";
import { chartSummaries, scores } from "../utils/scores";
import { findAlternateCatalogChart, findCatalogChart } from "../utils/catalog";
import { ChartDetailFrame } from "../components/chart/ChartDetailFrame";
import { ScoreHistory } from "../components/score/ScoreHistory";
import { calculatePlayRating } from "../utils/rating";
import { appHref } from "../utils/navigation";
import { classNames } from "../utils/class-names";
import { ChartNavigation } from "../components/chart/ChartNavigation";
import { DetailedChartInfoCard } from "../components/chart/DetailedChartInfoCard";

interface ChartDetailPageProps {
  chartId: string;
  scoreId?: string;
}

const backButtonClassName = "btn btn-secondary h-10 !rounded-2xl !bg-darker hover:!bg-lightest";

function BackToSongsButton() {
  const positionRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    let animationFrame = 0;
    const updatePosition = () => {
      const position = positionRef.current;
      if (position) setIsPinned(position.getBoundingClientRect().top <= 16);
    };
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updatePosition);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return (
    <>
      <div ref={positionRef} className="float-right ml-4 h-10">
        <a
          href={appHref("/scores")}
          className={classNames(backButtonClassName, { when: isPinned, then: "invisible" })}
          aria-hidden={isPinned}
          tabIndex={isPinned ? -1 : 0}
        >
          Back to Songs
        </a>
      </div>

      {isPinned && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[1100] mx-auto flex w-full max-w-5xl justify-end px-5 sm:px-8">
          <a href={appHref("/scores")} className={`${backButtonClassName} pointer-events-auto`}>
            Back to Songs
          </a>
        </div>
      )}
    </>
  );
}

export function ChartDetailPage({ chartId, scoreId }: ChartDetailPageProps) {
  const catalogEntry = findCatalogChart(chartId);
  const alternateCatalogEntry = findAlternateCatalogChart(chartId);
  const chart = catalogEntry?.chart;
  const chartSummary = chartSummaries[chartId];
  const achievement = chartSummary?.bestAchievement.value;
  const bestCombo = chartSummary?.bestCombo?.status ?? null;
  const bestSync = chartSummary?.bestSync?.status ?? null;

  const history = scores
    .filter((score) => score.chartId === chartId)
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt));

  const accentColor = chart
    ? chart.difficulty.replace(":", "").toLowerCase()
    : "primary";
  const playRating = achievement != null && chart?.chartConstant != null
    ? calculatePlayRating({ achievement, chartConstant: chart.chartConstant, combo: bestCombo })
    : null;

  return (
    <div>
      <section className="grid items-center gap-2 sm:gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-8">
        {catalogEntry && (
          <div className="mx-auto w-[250px] lg:mx-0 lg:w-full lg:max-w-73">
            <ChartDetailFrame
              catalogEntry={catalogEntry}
              achievement={achievement}
              combo={bestCombo}
              sync={bestSync}
            />
          </div>
        )}

        {catalogEntry && <div className={"min-w-0 self-center"}>
          <DetailedChartInfoCard
            catalogEntry={catalogEntry}
            accentColor={accentColor}
            achievement={achievement}
            bestCombo={bestCombo}
            bestSync={bestSync}
            playRating={playRating}
          />
          <ChartNavigation
            catalogEntry={catalogEntry}
            alternateCatalogEntry={alternateCatalogEntry}
          />
        </div>}
      </section>

      <section className="mt-10 md:mt-12">
        <BackToSongsButton />
        <h2 className="text-3xl font-semibold tracking-tight">Score History</h2>
        <div className="clear-both">
          <ScoreHistory
            scores={history}
            accentColor={accentColor}
            chartId={chartId}
            activeScoreId={scoreId}
          />
        </div>
      </section>
    </div>
  );
}
