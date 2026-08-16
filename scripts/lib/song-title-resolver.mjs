import { createSegaCatalogLoader } from "./sega-catalog.mjs";
import { createCatalogOverridesLoader, standaloneCatalogSongs } from "./catalog-overrides.mjs";

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
    .replace(/[\uFE0E\uFE0F]/g, "")
    // SEGA sometimes styles a Japanese prolonged sound with a wave dash.
    // OCR commonly returns the standard long-vowel mark for the same glyph.
    .replace(/[~〜～]/gu, "ー")
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

function songTitles(song) {
  return song.matchTitles?.length ? song.matchTitles : [song.title];
}

function titleMatches(song, target) {
  return songTitles(song).some((title) => normalizedSongTitle(title) === target);
}

function candidateNames(songs) {
  return songs.map((song) => [song.title, song.artist].filter(Boolean).join(" — ")).filter(Boolean).sort();
}

function normalizedArtist(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/gu, "").trim().toLocaleLowerCase();
}

function chartAvailable(song, chartType, difficulty) {
  const field = chartFields[chartType]?.[difficulty];
  return Boolean(field && String(song[field] ?? "").trim());
}

function disambiguateSongs(songs, { chartType, difficulty, level, visibleArtist }) {
  let candidates = uniqueSongs(songs);
  const chartMatches = candidates.filter((song) => chartAvailable(song, chartType, difficulty));
  if (chartMatches.length) candidates = chartMatches;
  const chartField = chartFields[chartType]?.[difficulty];
  const levelMatches = chartField
    ? candidates.filter((song) => String(song[chartField] ?? "").trim() === String(level ?? "").trim())
    : [];
  if (levelMatches.length) candidates = levelMatches;
  const artist = normalizedArtist(visibleArtist);
  if (artist) {
    const artistMatches = candidates.filter((song) => normalizedArtist(song.artist) === artist);
    if (artistMatches.length) candidates = artistMatches;
  }
  return candidates.length === 1 ? candidates[0] : null;
}

function editDistance(leftValue, rightValue) {
  const left = Array.from(leftValue);
  const right = Array.from(rightValue);
  let previous = right.map((_, index) => index + 1);
  previous.unshift(0);
  left.forEach((character, leftIndex) => {
    const current = [leftIndex + 1];
    right.forEach((other, rightIndex) => {
      current.push(Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + (character === other ? 0 : 1),
      ));
    });
    previous = current;
  });
  return previous.at(-1);
}

function permittedEditDistance(value) {
  const length = Array.from(value).length;
  if (length < 4) return 0;
  return length < 14 ? 1 : 2;
}

function closestUniqueMatch(value, songs, segmentsForTitle) {
  const maximum = permittedEditDistance(value);
  if (maximum === 0) return { match: null, ambiguous: [] };
  const scored = uniqueSongs(songs).map((song) => ({
    song,
    distance: Math.min(...segmentsForTitle(normalizedSongTitle(song.title))
      .map((segment) => editDistance(value, segment))),
  }));
  const nearestDistance = Math.min(...scored.map(({ distance }) => distance));
  if (nearestDistance > maximum) return { match: null, ambiguous: [] };
  const nearest = scored.filter(({ distance }) => distance === nearestDistance);
  return nearest.length === 1
    ? { match: nearest[0].song, ambiguous: [] }
    : { match: null, ambiguous: nearest.map(({ song }) => song) };
}

function resolveTitle(visibleTitle, titleTruncated, songs, context) {
  const target = normalizedSongTitle(visibleTitle);
  if (!target) {
    throw new SongResolutionError("EMPTY_TITLE", "OCR returned an empty song title.");
  }

  const exact = uniqueSongs(songs.filter((song) => titleMatches(song, target)));
  if (exact.length === 1) return { song: exact[0], matchType: "exact" };
  if (exact.length > 1) {
    const disambiguated = disambiguateSongs(exact, context);
    if (disambiguated) return { song: disambiguated, matchType: "exact-disambiguated" };
    throw new SongResolutionError(
      "AMBIGUOUS_TITLE",
      `Multiple SEGA songs exactly match ${JSON.stringify(visibleTitle)}.`,
      { candidates: candidateNames(exact) },
    );
  }

  if (!titleTruncated) {
    const fuzzy = closestUniqueMatch(target, songs, (title) => [title]);
    if (fuzzy.match) return { song: fuzzy.match, matchType: "fuzzy" };
    if (fuzzy.ambiguous.length) {
      const disambiguated = disambiguateSongs(fuzzy.ambiguous, context);
      if (disambiguated) return { song: disambiguated, matchType: "fuzzy-disambiguated" };
      throw new SongResolutionError(
        "AMBIGUOUS_TITLE",
        `The OCR title ${JSON.stringify(visibleTitle)} is equally close to multiple SEGA songs.`,
        { candidates: candidateNames(fuzzy.ambiguous) },
      );
    }
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
  const edgeMatches = uniqueSongs(songs.filter((song) => songTitles(song).some((candidate) => {
    const title = normalizedSongTitle(candidate);
    return title.startsWith(fragment) || title.endsWith(fragment);
  })));
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
  if (edgeMatches.length > 1) {
    const disambiguated = disambiguateSongs(edgeMatches, context);
    if (disambiguated) return { song: disambiguated, matchType: "truncated-edge-disambiguated" };
  }
  if (edgeMatches.length === 0) {
    const fragmentLength = Array.from(fragment).length;
    const fuzzy = closestUniqueMatch(fragment, songs, (title) => {
      const characters = Array.from(title);
      if (characters.length < fragmentLength) return [title];
      return [
        characters.slice(0, fragmentLength).join(""),
        characters.slice(-fragmentLength).join(""),
      ];
    });
    if (fuzzy.match) return { song: fuzzy.match, matchType: "truncated-fuzzy-edge" };
    if (fuzzy.ambiguous.length) {
      const disambiguated = disambiguateSongs(fuzzy.ambiguous, context);
      if (disambiguated) return { song: disambiguated, matchType: "truncated-fuzzy-disambiguated" };
      throw new SongResolutionError(
        "AMBIGUOUS_TITLE",
        `The clipped OCR title ${JSON.stringify(visibleTitle)} is equally close to multiple SEGA songs.`,
        { candidates: candidateNames(fuzzy.ambiguous) },
      );
    }
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
  if (chartType === "UTAGE" || song.lev_utage) {
    throw new SongResolutionError(
      "UNSUPPORTED_UTAGE",
      `${song.title} is an UTAGE chart, which is not supported by this importer.`,
      { canonicalTitle: song.title, chartType: "UTAGE", difficulty },
    );
  }
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

function defaultCatalogLoader() {
  const loadOfficialCatalog = createSegaCatalogLoader();
  const loadOverrides = createCatalogOverridesLoader();
  return async function loadCatalog() {
    const [officialSongs, overrides] = await Promise.all([loadOfficialCatalog(), loadOverrides()]);
    return [...officialSongs, ...standaloneCatalogSongs(overrides)];
  };
}

export function createSongTitleResolver({ loadCatalog = defaultCatalogLoader() } = {}) {
  return {
    async resolve({ visibleTitle, visibleArtist, titleTruncated, chartType, difficulty, level }) {
      const songs = await loadCatalog();
      const context = { chartType, difficulty, level, visibleArtist };
      const { song, matchType } = resolveTitle(visibleTitle, titleTruncated, songs, context);
      return {
        canonicalTitle: song.title,
        matchType,
        chart: resolveChart(song, chartType, difficulty),
        officialSong: song,
      };
    },
  };
}
