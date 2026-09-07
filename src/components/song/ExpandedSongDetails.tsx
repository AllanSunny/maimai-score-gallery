import { useState } from "react";
import type { ChartType, SongVersionSummary } from "../../utils/types";
import { OverflowMarquee } from "../ui/OverflowMarquee";
import { ChartTypeIcon } from "./ChartTypeIcon";
import { SongChartSummaryRow } from "./SongChartSummaryRow";

interface ExpandedSongDetailsProps {
  name: string;
  versions: SongVersionSummary[];
}

export function ExpandedSongDetails({ name, versions }: ExpandedSongDetailsProps) {
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(() =>
    versions.some((version) => version.chartType === "DX") ? "DX" : versions[0].chartType,
  );
  const selectedVersion = versions.find((version) => version.chartType === selectedChartType) ?? versions[0];

  return (
    <div className="p-3 pt-0 md:pt-3 rounded-lg md:flex md:flex-col" aria-label={`${name} chart summaries`}>
      <div className="mb-4 md:mb-2 flex flex-col items-center gap-2 px-10 md:flex-row md:justify-between md:pl-1">
        <div className="flex min-w-0 w-full flex-1 items-center md:items-left justify-center gap-4 md:justify-start">
          <ChartTypeIcon chartType={selectedVersion.chartType} className="hidden h-4 w-auto shrink-0 md:block" />
          <OverflowMarquee className="font-semibold text-lightest text-xl md:!text-left" centerWhenFit>{name}</OverflowMarquee>
        </div>
        <div className="flex w-full shrink-0 items-center justify-center gap-3 md:w-auto" aria-label="Chart version">
          <ChartTypeIcon chartType={selectedVersion.chartType} className="h-4 w-auto md:hidden" />
          {versions.filter((version) => version.chartType !== selectedVersion.chartType).map((version) =>
            <button
              key={version.chartType}
              type="button"
              aria-label={`Show ${version.chartType} charts`}
              onClick={() => setSelectedChartType(version.chartType)}
              className="btn btn-tertiary !rounded-lg !px-2 !py-1"
            >
              <ChartTypeIcon chartType={version.chartType} className="h-4 w-auto" />
            </button>)}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {selectedVersion.charts.map((chart) =>
          <SongChartSummaryRow key={`${chart.chartType}-${chart.difficulty}`} chart={chart} />)}
      </div>
    </div>
  );
}
