import type { Song } from "./types";

const jacketBaseUrl = import.meta.env?.VITE_JACKET_BASE_URL?.replace(/\/$/, "");

export function jacketUrl(song?: Pick<Song, "jacketKey">, baseUrl = jacketBaseUrl) {
  return baseUrl && song?.jacketKey
    ? `${baseUrl}/${song.jacketKey}`
    : null;
}
