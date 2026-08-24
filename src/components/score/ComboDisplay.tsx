import largeAp from "../../assets/achievements/large/combo/ap.png";
import largeApPlus from "../../assets/achievements/large/combo/ap_plus.png";
import largeFc from "../../assets/achievements/large/combo/fc.png";
import largeFcPlus from "../../assets/achievements/large/combo/fc_plus.png";
import smallAp from "../../assets/achievements/small/combo/ap.png";
import smallApPlus from "../../assets/achievements/small/combo/ap_plus.png";
import smallFc from "../../assets/achievements/small/combo/fc.png";
import smallFcPlus from "../../assets/achievements/small/combo/fc_plus.png";
import type { ComboStatus } from "../../utils/types";

type BadgeSize = "large" | "small";

interface ComboDisplayProps {
  status: ComboStatus | null | undefined;
  size: BadgeSize;
  className?: string;
}

const icons: Record<BadgeSize, Partial<Record<ComboStatus, string>>> = {
  large: { FC: largeFc, "FC+": largeFcPlus, AP: largeAp, "AP+": largeApPlus },
  small: { FC: smallFc, "FC+": smallFcPlus, AP: smallAp, "AP+": smallApPlus },
};

const labels: Partial<Record<ComboStatus, string>> = {
  FC: "Full combo",
  "FC+": "Full combo plus",
  AP: "All perfect",
  "AP+": "All perfect plus",
};

export function ComboDisplay({ status, size, className }: ComboDisplayProps) {
  const src = status ? icons[size][status] : undefined;
  if (!status || !src) return null;

  return <img className={className} src={src} alt={labels[status]} />;
}
