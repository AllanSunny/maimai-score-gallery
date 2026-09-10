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

export function songSearchText(titles: SongTitles): string {
  return allSongTitles(titles).join(" ").toLocaleLowerCase();
}

export function displayedAlternateTitles(titles: SongTitles): string[] {
  return [...new Set([...titles.romaji, ...titles.english, ...titles.aliases])];
}
