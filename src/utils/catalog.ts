import generatedCatalog from "../data/generated-catalog.json";
import { parseGeneratedCatalog } from "./data-validation";
import { allSongTitles } from "./song-titles";
import type { CatalogChartView, CatalogSongView } from "./types";

const jacketBaseUrl = import.meta.env.VITE_JACKET_BASE_URL?.replace(/\/$/, "");

const storedCatalog = parseGeneratedCatalog(generatedCatalog);
const songIdByVersionId = new Map(storedCatalog.songs.flatMap((song) =>
  song.versions.map((version) => [version.id, song.id] as const)));

const catalogSongs: CatalogSongView[] = storedCatalog.songs.flatMap((song) =>
  song.versions.map((version) => ({
    ...song,
    ...version,
    jacketUrl: jacketBaseUrl && song.jacketKey
      ? `${jacketBaseUrl}/${song.jacketKey}`
      : null,
  })));

function normalizeTitle(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

const catalogByTitleAndType = new Map<string, CatalogSongView>();
const catalogByChartId = new Map<string, CatalogChartView>();
const catalogBySongIdAndType = new Map<string, CatalogSongView>();

function catalogKey(title: string, chartType: CatalogSongView["chartType"]) {
  return `${normalizeTitle(title)}\u0000${chartType}`;
}

catalogSongs.forEach((song) => {
  const songId = songIdByVersionId.get(song.id);
  if (songId) catalogBySongIdAndType.set(catalogKey(songId, song.chartType), song);
  allSongTitles(song.titles).forEach((title) => {
    catalogByTitleAndType.set(catalogKey(title, song.chartType), song);
  });
  song.charts.forEach((chart) => {
    catalogByChartId.set(chart.id, { song, chart });
  });
});

export function findCatalogSong(title: string, chartType: CatalogSongView["chartType"]) {
  return catalogByTitleAndType.get(catalogKey(title, chartType));
}

export function findCatalogChart(chartId: string) {
  return catalogByChartId.get(chartId);
}

export function findAlternateCatalogChart(chartId: string) {
  const catalogEntry = findCatalogChart(chartId);
  if (!catalogEntry) return undefined;

  const alternateChartType = catalogEntry.song.chartType === "DX" ? "STD" : "DX";
  const songId = songIdByVersionId.get(catalogEntry.song.id);
  if (!songId) return undefined;

  const alternateSong = catalogBySongIdAndType.get(catalogKey(songId, alternateChartType));
  if (!alternateSong) return undefined;

  const alternateChart = alternateSong.charts.find(
    (chart) => chart.difficulty === catalogEntry.chart.difficulty,
  );

  return alternateChart ? { song: alternateSong, chart: alternateChart } : undefined;
}
