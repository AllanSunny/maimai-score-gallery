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

const catalogByTitle = new Map<string, CatalogSong>();

catalogSongs.forEach((song) => {
  [song.title, ...song.alternateTitles].forEach((title) => {
    catalogByTitle.set(normalizeTitle(title), song);
  });
});

export function findCatalogSong(title: string) {
  return catalogByTitle.get(normalizeTitle(title));
}
