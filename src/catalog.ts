import generatedCatalog from "./data/generated-catalog.json";
import type { CatalogSong } from "./types";

const jacketBaseUrl = import.meta.env.VITE_JACKET_BASE_URL?.replace(/\/$/, "");

export const catalogSongs = generatedCatalog.songs.map((song) => ({
  ...song,
  jacketUrl: jacketBaseUrl && song.jacketKey
    ? `${jacketBaseUrl}/${song.jacketKey}`
    : null,
})) as CatalogSong[];

function normalizeTitle(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

const catalogByTitleAndType = new Map<string, CatalogSong>();

function catalogKey(title: string, chartType: CatalogSong["chartType"]) {
  return `${normalizeTitle(title)}\u0000${chartType}`;
}

catalogSongs.forEach((song) => {
  [song.title, ...song.alternateTitles].forEach((title) => {
    catalogByTitleAndType.set(catalogKey(title, song.chartType), song);
  });
});

export function findCatalogSong(title: string, chartType: CatalogSong["chartType"]) {
  return catalogByTitleAndType.get(catalogKey(title, chartType));
}
