import type { CSSProperties } from "react";
import type { ChartCatalogEntry, ComboStatus, SyncStatus } from "../../utils/types";
import { displayedAlternateTitles } from "../../utils/song-titles";
import { displayedChartLevel } from "../../utils/chart-level";
import { achievementRank } from "../../utils/rank";
import { classNames } from "../../utils/class-names";
import { ContentCard } from "../ui/ContentCard";
import { OverflowMarquee } from "../ui/OverflowMarquee";
import { RankDisplay } from "../score/RankDisplay";
import { ComboDisplay } from "../score/ComboDisplay";
import { SyncDisplay } from "../score/SyncDisplay";

interface DetailedChartInfoCardProps {
  catalogEntry: ChartCatalogEntry;
  accentColor: string;
  achievement?: number;
  bestCombo: ComboStatus | null;
  bestSync: SyncStatus | null;
  playRating: number | null;
}

export function DetailedChartInfoCard({
  catalogEntry,
  accentColor,
  achievement,
  bestCombo,
  bestSync,
  playRating,
}: DetailedChartInfoCardProps) {
  const { chart, song } = catalogEntry;
  const alternateTitles = displayedAlternateTitles(song.titles);
  const isBelowS = achievement != null && achievement < 97;
  const textStrokeStyle = {
    "--text-stroke-color": `var(--color-${accentColor})`,
  } as CSSProperties;

  return (
    <ContentCard accentColor={accentColor} className="hidden lg:block">
      <div className="flex min-w-0 flex-col">
        <h1 className="flex min-w-0 text-lightest text-stroke [--text-stroke-color:var(--color-primary)]">
          <OverflowMarquee className="w-full px-1 font-semibold text-[1.8rem] sm:text-[2rem] lg:text-[2.5rem]">
            {song.titles.canonical}
          </OverflowMarquee>
        </h1>
        {alternateTitles.length > 0 && (
          <div className="ml-1 text-[1rem] text-darkest/50">
            {alternateTitles.join(" · ")}
          </div>
        )}
        <div className="ml-1 mt-1 text-[1rem] sm:text-[1.2rem] text-dark">
          {song.artist}
        </div>

        <div className="ml-1 mt-3 flex flex-row gap-2 text-[1.2rem] sm:text-[1.5rem]">
          <div className="flex text-darker text-stroke" style={textStrokeStyle}>
            {chart.difficulty} {displayedChartLevel(chart.level, chart.chartConstant)}
          </div>
          {playRating != null && (
            <div className="flex text-darker text-stroke whitespace-nowrap" style={textStrokeStyle}>
              {`· Rating: ${playRating}`}
            </div>
          )}
        </div>

        <div className="mt-8">
          <div className="ml-1 text-darkest">Achievement</div>
          {achievement != null && (
            <div className="flex flex-row gap-4 sm:gap-6 items-center">
              <div
                className={classNames(
                  "flex text-[1.6rem] sm:text-[2rem] lg:text-[2.3rem] achievement-value text-stroke font-bold",
                  { when: isBelowS, then: "achievement-value--below-s" },
                )}
              >
                {`${achievement.toFixed(4)}%`}
              </div>
              <RankDisplay
                className="flex h-6 lg:h-7"
                status={achievementRank(achievement)}
                size="large"
              />
            </div>
          )}
          {achievement == null && <div className="ml-1 mt-2 text-dark">—</div>}

          <div className="ml-1 flex flex-row gap-6">
            <ComboDisplay className="h-8 sm:h-9 lg:h-10" status={bestCombo} size="large" />
            <SyncDisplay className="h-8 sm:h-9 lg:h-10" status={bestSync} size="large" />
          </div>
        </div>
      </div>
    </ContentCard>
  );
}
