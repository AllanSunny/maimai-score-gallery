import { createSegaCatalogLoader } from "./sega-catalog.mjs";

const chartFields = {
  DX: {
    BASIC: "dx_lev_bas",
    ADVANCED: "dx_lev_adv",
    EXPERT: "dx_lev_exp",
    MASTER: "dx_lev_mas",
    "Re:MASTER": "dx_lev_remas",
  },
  STD: {
    BASIC: "lev_bas",
    ADVANCED: "lev_adv",
    EXPERT: "lev_exp",
    MASTER: "lev_mas",
    "Re:MASTER": "lev_remas",
  },
};

export class SongResolutionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "SongResolutionError";
    this.code = code;
    Object.assign(this, details);
  }
}

export function normalizedSongTitle(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/gu, "")
    .trim()
    .toLocaleLowerCase();
}

function visibleTitleFragment(value) {
  return normalizedSongTitle(String(value ?? "")
    .replace(/^\s*(?:\.{3}|…)+/u, "")
    .replace(/(?:\.{3}|…)+\s*$/u, ""));
}

function uniqueSongs(songs) {
  const seen = new Set();
  return songs.filter((song) => {
    const key = JSON.stringify([song.title, song.image_url]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function candidateNames(songs) {
  return songs.map((song) => String(song.title ?? "")).filter(Boolean).sort();
}

function resolveTitle(visibleTitle, titleTruncated, songs) {
  const target = normalizedSongTitle(visibleTitle);
  if (!target) {
    throw new SongResolutionError("EMPTY_TITLE", "OCR returned an empty song title.");
  }

  const exact = uniqueSongs(songs.filter((song) => normalizedSongTitle(song.title) === target));
  if (exact.length === 1) return { song: exact[0], matchType: "exact" };
  if (exact.length > 1) {
    throw new SongResolutionError(
      "AMBIGUOUS_TITLE",
      `Multiple SEGA songs exactly match ${JSON.stringify(visibleTitle)}.`,
      { candidates: candidateNames(exact) },
    );
  }

  if (!titleTruncated) {
    throw new SongResolutionError(
      "UNKNOWN_TITLE",
      `No SEGA song matches ${JSON.stringify(visibleTitle)}.`,
      { candidates: [] },
    );
  }

  const fragment = visibleTitleFragment(visibleTitle);
  if (fragment.length < 3) {
    throw new SongResolutionError(
      "TITLE_TOO_SHORT",
      `The clipped title ${JSON.stringify(visibleTitle)} is too short to resolve safely.`,
      { candidates: [] },
    );
  }
  const edgeMatches = uniqueSongs(songs.filter((song) => {
    const title = normalizedSongTitle(song.title);
    return title.startsWith(fragment) || title.endsWith(fragment);
  }));
  if (edgeMatches.length === 1) {
    const title = normalizedSongTitle(edgeMatches[0].title);
    const matchesBeginning = title.startsWith(fragment);
    const matchesEnding = title.endsWith(fragment);
    const matchType = matchesBeginning && !matchesEnding
      ? "truncated-prefix"
      : matchesEnding && !matchesBeginning
        ? "truncated-suffix"
        : "truncated-edge";
    return { song: edgeMatches[0], matchType };
  }
  if (edgeMatches.length === 0) {
    throw new SongResolutionError(
      "UNKNOWN_TITLE",
      `No SEGA song has an edge matching the clipped title ${JSON.stringify(visibleTitle)}.`,
      { candidates: [] },
    );
  }
  throw new SongResolutionError(
    "AMBIGUOUS_TITLE",
    `The clipped title ${JSON.stringify(visibleTitle)} matches multiple SEGA songs.`,
    { candidates: candidateNames(edgeMatches) },
  );
}

function resolveChart(song, chartType, difficulty) {
  const field = chartFields[chartType]?.[difficulty];
  const level = field ? String(song[field] ?? "").trim() : "";
  if (!field || !level) {
    throw new SongResolutionError(
      "CHART_NOT_FOUND",
      `${song.title} has no ${chartType} ${difficulty} chart in the SEGA catalog.`,
      { canonicalTitle: song.title, chartType, difficulty },
    );
  }
  return { chartType, difficulty, level };
}

export function createSongTitleResolver({ loadCatalog = createSegaCatalogLoader() } = {}) {
  return {
    async resolve({ visibleTitle, titleTruncated, chartType, difficulty }) {
      const songs = await loadCatalog();
      const { song, matchType } = resolveTitle(visibleTitle, titleTruncated, songs);
      return {
        canonicalTitle: song.title,
        matchType,
        chart: resolveChart(song, chartType, difficulty),
        officialSong: song,
      };
    },
  };
}
