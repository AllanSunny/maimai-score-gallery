import generatedCatalog from "./data/generated-catalog.json";
import type { CatalogSong } from "./types";

export const catalogSongs = generatedCatalog.songs as CatalogSong[];

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
