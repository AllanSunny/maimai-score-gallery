import type { CSSProperties } from "react";
import { chartSummaries, scores } from "../utils/scores";
import { findCatalogChart } from "../utils/catalog";
import { SongDetailFrame } from "../components/song/SongDetailFrame";
import { ContentCard } from "../components/ui/ContentCard";
import { OverflowMarquee } from "../components/ui/OverflowMarquee";
import { ScoreHistory } from "../components/score/ScoreHistory";
import { displayedAlternateTitles } from "../utils/song-titles";
import { ComboDisplay } from "../components/score/ComboDisplay";
import { SyncDisplay } from "../components/score/SyncDisplay";
import { displayedChartLevel } from "../utils/chart-level";
import { calculatePlayRating } from "../utils/rating";
import { RankDisplay } from "../components/score/RankDisplay";
import { achievementRank } from "../utils/rank";

interface ChartDetailPageProps {
  chartId: string;
}

export function ChartDetailPage({ chartId }: ChartDetailPageProps) {
  const catalogEntry = findCatalogChart(chartId);
  const metadata = catalogEntry?.song;
  const chartMetadata = catalogEntry?.chart;
  const chartSummary = chartSummaries[chartId];
  const achievement = chartSummary?.bestAchievement.value;
  const bestCombo = chartSummary?.bestCombo.status ?? null;
  const bestSync = chartSummary?.bestSync?.status ?? null;
  const isBelowS = achievement != null && achievement < 97;
  const alternateTitles = metadata ? displayedAlternateTitles(metadata.titles) : [];

  const history = scores
    .filter((score) => score.chartId === chartId)
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt));

  const accentColor = chartMetadata
    ? chartMetadata.difficulty.replace(":", "").toLowerCase()
    : "primary";
  const playRating = achievement != null && chartMetadata?.chartConstant != null
    ? calculatePlayRating({ achievement, chartConstant: chartMetadata.chartConstant, combo: bestCombo })
    : null;

  return (
    <div>
      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {metadata?.jacketUrl && chartMetadata && (
          <SongDetailFrame
            title={metadata.titles.canonical}
            artist={metadata.artist}
            jacketUrl={metadata.jacketUrl}
            chartType={metadata.chartType}
            difficulty={chartMetadata.difficulty}
            level={chartMetadata.level}
            achievement={achievement}
            combo={bestCombo}
            sync={bestSync}
            className="mx-auto w-full max-w-80 lg:mx-0"
          />
        )}

        {metadata && chartMetadata && <div className={"mt-3 min-w-0 self-center"}>
          <ContentCard accentColor={accentColor}>
            <div className={"flex min-w-0 flex-col"}>
              <h1 className={"flex min-w-0 text-lightest text-stroke [--text-stroke-color:var(--color-primary)]"}>
                <OverflowMarquee className="w-full px-1 font-semibold text-[1.8rem] sm:text-[2rem] lg:text-[2.5rem]">
                  {metadata.titles.canonical}
                </OverflowMarquee>
              </h1>
              {alternateTitles.length > 0 && (
                <div className="ml-1 text-[1rem] text-darkest/50">
                  {alternateTitles.join(" · ")}
                </div>
              )}
              <div className={"ml-1 mt-1 text-[1rem] sm:text-[1.2rem] text-dark"}>
                {metadata.artist}
              </div>

              <div className={"ml-1 mt-3 text-[1.2rem] sm:text-[1.5rem]"}>
                <span
                  className="text-darker text-stroke"
                  style={{
                    "--text-stroke-color": `var(--color-${accentColor})`,
                  } as CSSProperties}
                >
                  {chartMetadata.difficulty} {displayedChartLevel(chartMetadata.level, chartMetadata.chartConstant)}
                </span>
                {playRating != null && (
                  <span
                    className="text-darker text-stroke whitespace-nowrap"
                    style={{
                      "--text-stroke-color": `var(--color-${accentColor})`,
                    } as CSSProperties}
                  >
                    {` · Rating: ${playRating}`}
                  </span>
                )}
              </div>

              <div className={"mt-8"}>
                <p className={"ml-1 text-[1rem] sm:text-[1.25rem] text-darkest"}>Achievement</p>
                {achievement != null && (
                  <div className={"flex flex-row gap-4 sm:gap-6 items-center"}>
                    <span
                      className={[
                        "flex text-[1.6rem] sm:text-[2rem] lg:text-[2.3rem] achievement-value text-stroke font-bold",
                        isBelowS && "achievement-value--below-s",
                      ].filter(Boolean).join(" ")}
                    >
                      {`${achievement.toFixed(4)}%`}
                    </span>
                    <RankDisplay
                      className="flex h-6 lg:h-7"
                      status={achievement == null ? null : achievementRank(achievement)}
                      size="large"
                    />
                  </div>
                )}
                {achievement == null && (<div className={"ml-1 mt-2 text-dark"}>{'—'}</div>)}

                <div className={"ml-1 flex flex-row gap-6"}>
                  <ComboDisplay className="h-8 sm:h-9 lg:h-10" status={bestCombo} size="large" />
                  <SyncDisplay className="h-8 sm:h-9 lg:h-10" status={bestSync} size="large" />
                </div>
              </div>
            </div>
          </ContentCard>
        </div>}
      </section>

      <section className="mt-12">
        <h2 className="text-3xl font-semibold tracking-tight">Score History</h2>
        <ScoreHistory scores={history} accentColor={accentColor} />
      </section>
    </div>
  );
}
