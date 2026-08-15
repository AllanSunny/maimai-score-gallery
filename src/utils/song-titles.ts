import type { SongTitles } from "./types";

export function allSongTitles(titles: SongTitles): string[] {
  return [
    titles.canonical,
    ...titles.kana,
    ...titles.romaji,
    ...titles.english,
    ...titles.aliases,
  ];
}
