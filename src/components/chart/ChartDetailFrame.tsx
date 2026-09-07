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
import { useFallbackImage } from "../../hooks/useFallbackImage";
import type { ChartType, ComboStatus, Difficulty, SyncStatus } from "../../utils/types";
import favicon from "../../assets/favicon.png";
import { OverflowMarquee } from "../ui/OverflowMarquee";
import { ComboDisplay } from "../score/ComboDisplay";
import { SyncDisplay } from "../score/SyncDisplay";
import { RankDisplay } from "../score/RankDisplay";
import "./ChartDetailFrame.css";

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
  title: string;
  artist: string;
  jacketUrl: string;
  chartType: ChartType;
  difficulty: Difficulty;
  level: string;
  achievement?: number;
  combo?: ComboStatus | null;
  sync?: SyncStatus | null;
  className?: string;
}

export function ChartDetailFrame({
  title,
  artist,
  jacketUrl,
  chartType,
  difficulty,
  level,
  achievement,
  combo,
  sync,
  className = "",
}: ChartDetailFrameProps) {
  const handleImageError = useFallbackImage(favicon);
  const normalizedLevel = level.trim();
  const hasPlus = normalizedLevel.endsWith("+");
  const levelNumber = hasPlus ? normalizedLevel.slice(0, -1) : normalizedLevel;

  return (
    <article
      className={`chart-detail-frame ${className}`.trim()}
      data-difficulty={difficulty}
      aria-label={`${title}, ${difficulty} level ${normalizedLevel}, ${chartType}`}
    >
      <img className="chart-detail-frame__jacket" src={jacketUrl} alt="" onError={handleImageError} />
      <img className="chart-detail-frame__frame" src={frames[chartType][difficulty]} alt="" />

      <div className="chart-detail-frame__difficulty">{difficulty}</div>
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
        <OverflowMarquee centerWhenFit>{artist}</OverflowMarquee>
      </div>

      {achievement != null && (
        <div
          className={[
            "chart-detail-frame__achievement achievement-value text-stroke",
            achievement < 97 && "achievement-value--below-s",
          ].filter(Boolean).join(" ")}
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
