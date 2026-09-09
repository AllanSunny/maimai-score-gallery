import advancedDxFrame from "../../assets/jacket_frames/dx/advanced.png";
import basicDxFrame from "../../assets/jacket_frames/dx/basic.png";
import expertDxFrame from "../../assets/jacket_frames/dx/expert.png";
import masterDxFrame from "../../assets/jacket_frames/dx/master.png";
import remasterDxFrame from "../../assets/jacket_frames/dx/remaster.png";
import advancedStdFrame from "../../assets/jacket_frames/std/advanced.png";
import basicStdFrame from "../../assets/jacket_frames/std/basic.png";
import expertStdFrame from "../../assets/jacket_frames/std/expert.png";
import masterStdFrame from "../../assets/jacket_frames/std/master.png";
import remasterStdFrame from "../../assets/jacket_frames/std/remaster.png";
import { achievementRank } from "../../utils/rank";
import type { ChartCatalogEntry, ChartType, ComboStatus, Difficulty, SyncStatus } from "../../utils/types";
import { OverflowMarquee } from "../ui/OverflowMarquee";
import { ComboDisplay } from "../score/ComboDisplay";
import { SyncDisplay } from "../score/SyncDisplay";
import { RankDisplay } from "../score/RankDisplay";
import { classNames } from "../../utils/class-names";
import { SongJacketImage } from "../song/SongJacketImage";

const frames: Record<ChartType, Record<Difficulty, string>> = {
  DX: {
    BASIC: basicDxFrame,
    ADVANCED: advancedDxFrame,
    EXPERT: expertDxFrame,
    MASTER: masterDxFrame,
    "Re:MASTER": remasterDxFrame,
  },
  STD: {
    BASIC: basicStdFrame,
    ADVANCED: advancedStdFrame,
    EXPERT: expertStdFrame,
    MASTER: masterStdFrame,
    "Re:MASTER": remasterStdFrame,
  },
};

interface ChartDetailFrameProps {
  catalogEntry: ChartCatalogEntry;
  achievement?: number;
  combo?: ComboStatus | null;
  sync?: SyncStatus | null;
  className?: string;
}

export function ChartDetailFrame({
  catalogEntry,
  achievement,
  combo,
  sync,
  className = "",
}: ChartDetailFrameProps) {
  const { chart, song, version } = catalogEntry;
  const chartType = version.chartType;
  const title = song.titles.canonical;
  const normalizedLevel = chart.level.trim();
  const hasPlus = normalizedLevel.endsWith("+");
  const levelNumber = hasPlus ? normalizedLevel.slice(0, -1) : normalizedLevel;

  return (
    <article
      className={`chart-detail-frame ${className}`.trim()}
      data-difficulty={chart.difficulty}
      aria-label={`${title}, ${chart.difficulty} level ${normalizedLevel}, ${chartType}`}
    >
      <SongJacketImage className="chart-detail-frame__jacket" song={song} />
      <img className="chart-detail-frame__frame" src={frames[chartType][chart.difficulty]} alt="" />

      <div className="chart-detail-frame__difficulty">{chart.difficulty}</div>
      <div className="chart-detail-frame__level" aria-label={`Level ${normalizedLevel}`}>
        <div className="chart-detail-frame__level-layer chart-detail-frame__level-glow" aria-hidden="true">
          <div className="chart-detail-frame__level-prefix">LV</div>
          <div className="chart-detail-frame__level-value">
            <div>{levelNumber}</div>
            {hasPlus && <sup>+</sup>}
          </div>
        </div>

        <div className="chart-detail-frame__level-layer chart-detail-frame__level-text" aria-hidden="true">
          <div className="chart-detail-frame__level-prefix">LV</div>
          <div className="chart-detail-frame__level-value">
            <div>{levelNumber}</div>
            {hasPlus && <sup>+</sup>}
          </div>
        </div>
      </div>

      <header className="chart-detail-frame__title">
        <OverflowMarquee centerWhenFit>{title}</OverflowMarquee>
      </header>
      <div className="chart-detail-frame__artist">
        <OverflowMarquee centerWhenFit>{song.artist}</OverflowMarquee>
      </div>

      {achievement != null && (
        <div
          className={classNames(
            "chart-detail-frame__achievement achievement-value text-stroke",
            { when: achievement < 97, then: "achievement-value--below-s" },
          )}
        >
          {`${achievement.toFixed(4)}%`}
        </div>
      )}
      <RankDisplay
        className="chart-detail-frame__rank"
        status={achievement == null ? null : achievementRank(achievement)}
        size="small"
      />
      <ComboDisplay className="chart-detail-frame__combo" status={combo} size="small" />
      <SyncDisplay className="chart-detail-frame__sync" status={sync} size="small" />
    </article>
  );
}
