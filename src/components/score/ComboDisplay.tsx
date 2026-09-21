import largeAp from "../../assets/achievements/large/combo/ap.png";
import largeApPlus from "../../assets/achievements/large/combo/ap_plus.png";
import largeFc from "../../assets/achievements/large/combo/fc.png";
import largeFcPlus from "../../assets/achievements/large/combo/fc_plus.png";
import largeNone from "../../assets/achievements/large/combo/none.png";
import smallAp from "../../assets/achievements/small/combo/ap.png";
import smallApPlus from "../../assets/achievements/small/combo/ap_plus.png";
import smallFc from "../../assets/achievements/small/combo/fc.png";
import smallFcPlus from "../../assets/achievements/small/combo/fc_plus.png";
import smallNone from "../../assets/achievements/small/combo/none.png";
import type { ComboStatus } from "../../utils/types";

type BadgeSize = "large" | "small";

interface ComboDisplayProps {
  status: ComboStatus | null | undefined;
  size: BadgeSize;
  className?: string;
  showNone?: boolean;
}

const icons: Record<BadgeSize, Partial<Record<ComboStatus, string>>> = {
  large: { FC: largeFc, "FC+": largeFcPlus, AP: largeAp, "AP+": largeApPlus },
  small: { FC: smallFc, "FC+": smallFcPlus, AP: smallAp, "AP+": smallApPlus },
};

const noneIcons: Record<BadgeSize, string> = {
  large: largeNone,
  small: smallNone,
};

const labels: Partial<Record<ComboStatus, string>> = {
  FC: "Full combo",
  "FC+": "Full combo plus",
  AP: "All perfect",
  "AP+": "All perfect plus",
};

export function ComboDisplay({ status, size, className, showNone = true }: ComboDisplayProps) {
  if (!status) {
    return showNone ? <img className={className} src={noneIcons[size]} alt="No combo" /> : null;
  }

  const src = icons[size][status];

  return <img className={className} src={src} alt={labels[status]} />;
}
