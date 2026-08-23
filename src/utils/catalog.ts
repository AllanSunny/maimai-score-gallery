import generatedCatalog from "../data/generated-catalog.json";
import { parseGeneratedCatalog } from "./data-validation";
import { allSongTitles } from "./song-titles";
import type { CatalogChartView, CatalogSongView } from "./types";

const jacketBaseUrl = import.meta.env.VITE_JACKET_BASE_URL?.replace(/\/$/, "");

const storedCatalog = parseGeneratedCatalog(generatedCatalog);

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

function catalogKey(title: string, chartType: CatalogSongView["chartType"]) {
  return `${normalizeTitle(title)}\u0000${chartType}`;
}

catalogSongs.forEach((song) => {
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
