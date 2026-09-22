import type { CSSProperties } from "react";
import youtubeIcon from "../../assets/icons/svg/youtube.svg";
import { ChartTypeIcon } from "../ui/game/ChartTypeIcon";
import { SvgIcon } from "../ui/SvgIcon";
import type { ChartCatalogEntry } from "../../utils/types";
import { appHref } from "../../utils/navigation";
import { youtubeChartSearchUrl } from "../../utils/youtube";

interface ChartNavigationProps {
  catalogEntry: ChartCatalogEntry;
  alternateCatalogEntry?: ChartCatalogEntry;
}

export function ChartNavigation({ catalogEntry, alternateCatalogEntry }: ChartNavigationProps) {
  const { chart, song, version } = catalogEntry;

  return (
    <nav className="mt-2 lg:mt-6 justify-center flex flex-wrap gap-2" aria-label="Chart navigation">
      {version.charts.map((difficultyChart) => {
        const difficultyColor = difficultyChart.difficulty.replace(":", "").toLowerCase();
        const buttonStyle = {
          "--btn-background": `var(--color-${difficultyColor})`,
        } as CSSProperties;

        if (difficultyChart.id === chart.id) {
          return (
            <button
              key={difficultyChart.id}
              type="button"
              className="btn btn-primary"
              style={buttonStyle}
              disabled
              aria-current="page"
            >
              {difficultyChart.difficulty}
            </button>
          );
        }

        return (
          <a
            key={difficultyChart.id}
            href={appHref(`/charts/${encodeURIComponent(difficultyChart.id)}`)}
            data-preserve-scroll
            className="btn btn-primary"
            style={buttonStyle}
          >
            {difficultyChart.difficulty}
          </a>
        );
      })}
      {alternateCatalogEntry && (
        <a
          href={appHref(`/charts/${encodeURIComponent(alternateCatalogEntry.chart.id)}`)}
          data-preserve-scroll
          className="btn btn-primary h-9 min-w-9 sm:h-10 sm:min-w-10"
          style={{ "--btn-background": "var(--color-dark)" } as CSSProperties}
          aria-label={`Show ${alternateCatalogEntry.version.chartType} chart`}
        >
          <ChartTypeIcon chartType={alternateCatalogEntry.version.chartType} className="h-5 w-auto" />
        </a>
      )}
      <a
        href={youtubeChartSearchUrl({
          title: song.titles.canonical,
          chartType: version.chartType,
          difficulty: chart.difficulty,
          hasMultipleVersions: alternateCatalogEntry != null,
        })}
        className="btn btn-youtube"
        target="_blank"
        rel="noreferrer"
      >
        <SvgIcon icon={youtubeIcon} className="mr-2 h-4 w-5" />
        Find on YouTube
      </a>
    </nav>
  );
}
