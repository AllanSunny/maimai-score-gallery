import type { CSSProperties } from "react";
import youtubeIcon from "../../assets/icons/youtube.svg";
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
    <nav className="mt-2 lg:mt-6 justify-center flex flex-wrap gap-2 sm:gap-3 md:gap-5" aria-label="Chart difficulties">
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
          className="btn btn-primary"
        >
          {alternateCatalogEntry.version.chartType}
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
        <img className="youtube-icon mr-2 h-4 w-5" src={youtubeIcon} alt="" />
        Find on YouTube
      </a>
    </nav>
  );
}
