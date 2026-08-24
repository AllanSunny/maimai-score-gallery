import largeA from "../../assets/achievements/large/rank/a.png";
import largeAa from "../../assets/achievements/large/rank/aa.png";
import largeAaa from "../../assets/achievements/large/rank/aaa.png";
import largeClear from "../../assets/achievements/large/rank/clear.png";
import largeS from "../../assets/achievements/large/rank/s.png";
import largeSPlus from "../../assets/achievements/large/rank/s_plus.png";
import largeSs from "../../assets/achievements/large/rank/ss.png";
import largeSsPlus from "../../assets/achievements/large/rank/ss_plus.png";
import largeSss from "../../assets/achievements/large/rank/sss.png";
import largeSssPlus from "../../assets/achievements/large/rank/sss_plus.png";
import smallA from "../../assets/achievements/small/rank/a.png";
import smallAa from "../../assets/achievements/small/rank/aa.png";
import smallAaa from "../../assets/achievements/small/rank/aaa.png";
import smallClear from "../../assets/achievements/small/rank/clear.png";
import smallS from "../../assets/achievements/small/rank/s.png";
import smallSPlus from "../../assets/achievements/small/rank/s_plus.png";
import smallSs from "../../assets/achievements/small/rank/ss.png";
import smallSsPlus from "../../assets/achievements/small/rank/ss_plus.png";
import smallSss from "../../assets/achievements/small/rank/sss.png";
import smallSssPlus from "../../assets/achievements/small/rank/sss_plus.png";
import type { AchievementRank } from "../../utils/rank";

type BadgeSize = "large" | "small";

interface RankDisplayProps {
  status: AchievementRank | null | undefined;
  size: BadgeSize;
  className?: string;
}

const icons: Record<BadgeSize, Record<AchievementRank, string>> = {
  large: {
    Failed: largeClear,
    A: largeA,
    AA: largeAa,
    AAA: largeAaa,
    S: largeS,
    "S+": largeSPlus,
    SS: largeSs,
    "SS+": largeSsPlus,
    SSS: largeSss,
    "SSS+": largeSssPlus,
  },
  small: {
    Failed: smallClear,
    A: smallA,
    AA: smallAa,
    AAA: smallAaa,
    S: smallS,
    "S+": smallSPlus,
    SS: smallSs,
    "SS+": smallSsPlus,
    SSS: smallSss,
    "SSS+": smallSssPlus,
  },
};

export function RankDisplay({ status, size, className }: RankDisplayProps) {
  if (!status) return null;

  return <img className={className} src={icons[size][status]} alt={`${status} rank`} />;
}
