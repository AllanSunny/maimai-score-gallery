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
import type { ChartType, Difficulty } from "../../types";
import "./SongDetailFrame.css";

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

export interface SongDetailFrameProps {
  title: string;
  artist: string;
  jacketUrl: string;
  chartType: ChartType;
  difficulty: Difficulty;
  level: string;
  className?: string;
}

function fittedTextSize(text: string, normal: number, medium: number, small: number) {
  if (text.length > 28) return `${small}cqw`;
  if (text.length > 18) return `${medium}cqw`;
  return `${normal}cqw`;
}

export function SongDetailFrame({
  title,
  artist,
  jacketUrl,
  chartType,
  difficulty,
  level,
  className = "",
}: SongDetailFrameProps) {
  const normalizedLevel = level.trim();
  const hasPlus = normalizedLevel.endsWith("+");
  const levelNumber = hasPlus ? normalizedLevel.slice(0, -1) : normalizedLevel;

  return (
    <article
      className={`song-detail-frame ${className}`.trim()}
      data-difficulty={difficulty}
      aria-label={`${title}, ${difficulty} level ${normalizedLevel}, ${chartType}`}
    >
      <img className="song-detail-frame__jacket" src={jacketUrl} alt="" />
      <img className="song-detail-frame__frame" src={frames[chartType][difficulty]} alt="" />

      <div className="song-detail-frame__difficulty">{difficulty}</div>
      <div className="song-detail-frame__level" aria-label={`Level ${normalizedLevel}`}>
        <span className="song-detail-frame__level-prefix">LV</span>
        <span className="song-detail-frame__level-value">
          <span>{levelNumber}</span>
          {hasPlus && <sup>+</sup>}
        </span>
      </div>

      <div
        className="song-detail-frame__title"
        style={{ fontSize: fittedTextSize(title, 4.5, 3.8, 3.15) }}
      >
        {title}
      </div>
      <div
        className="song-detail-frame__artist"
        style={{ fontSize: fittedTextSize(artist, 3.5, 3.05, 2.6) }}
      >
        {artist}
      </div>
    </article>
  );
}
