import generatedCatalog from "../data/generated-catalog.json";
import { parseGeneratedCatalog } from "./data-validation";
import { allSongTitles } from "./song-titles";
import type { ChartCatalogEntry, ChartType, SongCatalogEntry } from "./types";

const storedCatalog = parseGeneratedCatalog(generatedCatalog);

function normalizeTitle(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

const catalogByTitleAndType = new Map<string, SongCatalogEntry>();
const catalogByChartId = new Map<string, ChartCatalogEntry>();

function catalogKey(title: string, chartType: ChartType) {
  return `${normalizeTitle(title)}\u0000${chartType}`;
}

storedCatalog.songs.forEach((song) => {
  song.versions.forEach((version) => {
    const songEntry = { song, version };
    allSongTitles(song.titles).forEach((title) => {
      catalogByTitleAndType.set(catalogKey(title, version.chartType), songEntry);
    });
    version.charts.forEach((chart) => {
      catalogByChartId.set(chart.id, { ...songEntry, chart });
    });
  });
});

export function findCatalogSong(title: string, chartType: ChartType) {
  return catalogByTitleAndType.get(catalogKey(title, chartType));
}

export function findCatalogChart(chartId: string) {
  return catalogByChartId.get(chartId);
}

export function findAlternateCatalogChart(chartId: string) {
  const catalogEntry = findCatalogChart(chartId);
  if (!catalogEntry) return undefined;

  const alternateChartType = catalogEntry.version.chartType === "DX" ? "STD" : "DX";
  const alternateVersion = catalogEntry.song.versions.find(
    (version) => version.chartType === alternateChartType,
  );
  if (!alternateVersion) return undefined;

  const alternateChart = alternateVersion.charts.find(
    (chart) => chart.difficulty === catalogEntry.chart.difficulty,
  );

  return alternateChart ? findCatalogChart(alternateChart.id) : undefined;
}
