import { chartSummaries, scores } from "../utils/scores";
import { findCatalogChart } from "../utils/catalog";
import { SongDetailFrame } from "../components/song/SongDetailFrame";
import { formatEasternDateTime } from "../utils/date-time";
import { achievementRank } from "../utils/rank";
import { ContentCard } from "../components/ui/ContentCard";
import { OverflowMarquee } from "../components/ui/OverflowMarquee";

interface ChartDetailPageProps {
  chartId: string;
}

export function ChartDetailPage({ chartId }: ChartDetailPageProps) {
  const catalogEntry = findCatalogChart(chartId);
  const metadata = catalogEntry?.song;
  const chartMetadata = catalogEntry?.chart;
  const chartSummary = chartSummaries[chartId];
  const achievement = chartSummary?.bestAchievement.value;
  const bestCombo = chartSummary?.bestCombo.status;
  const bestSync = chartSummary?.bestSync?.status ?? null;
  const isBelowS = achievement != null && achievement < 97;

  const history = scores
    .filter((score) => score.chartId === chartId)
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt));

  const accentColor = chartMetadata
    ? chartMetadata.difficulty.replace(":", "").toLowerCase()
    : "primary";

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

        {metadata && chartMetadata && <div className={"mt-3 min-w-0"}>
          <ContentCard accentColor={accentColor}>
            <div className={"flex min-w-0 flex-col"}>
              <div className={"flex min-w-0"} style={{ color: `var(--color-${accentColor})`}}>
                <OverflowMarquee className="w-full px-1 text-[2.5rem]">
                  {metadata.titles.canonical}
                </OverflowMarquee>
              </div>
              <div className={""}>
                <p className={"ml-1 text-[1.5rem] text-dark"}>Achievement</p>
                {achievement != null && (
                  <span
                    className={[
                      "text-[2.5rem] achievement-value",
                      isBelowS && "achievement-value--below-s",
                    ].filter(Boolean).join(" ")}
                  >
                  {`${achievement.toFixed(4)}%`}
                </span>
                )}
              </div>
            </div>

          </ContentCard>
        </div>}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Score progression</h2>
        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white/60">
          {history.map((score) => <div key={score.id} className="flex justify-between border-b border-line p-5 text-sm last:border-0"><time className="text-lightest">{formatEasternDateTime(score.playedAt)}</time><span className="text-right"><span className="block font-semibold tabular-nums">{score.achievement.toFixed(4)}%</span><span className="mt-1 block text-xs font-semibold text-lightest">{achievementRank(score.achievement)}</span></span></div>)}
          {!history.length && <p className="p-10 text-center text-sm text-lightest">No plays recorded for this chart yet.</p>}
        </div>
      </section>
    </div>
  );
}
