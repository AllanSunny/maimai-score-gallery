import type { ChartType } from "../../utils/types";
import dxIcon from "../../assets/icons/dx.png";
import stdIcon from "../../assets/icons/std.png";

const chartTypeIcons = { DX: dxIcon, STD: stdIcon } satisfies Record<ChartType, string>;

interface ChartTypeIconProps {
  chartType: ChartType;
  className?: string;
}

export function ChartTypeIcon({ chartType, className }: ChartTypeIconProps) {
  return <img src={chartTypeIcons[chartType]} alt={chartType} className={className} />;
}
