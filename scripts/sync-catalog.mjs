import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { enrichMissingSongTitles } from "./lib/catalog-title-enrichment.mjs";
import { standaloneCatalogSongs } from "./lib/catalog-overrides.mjs";
import { catalogOutput } from "./lib/catalog-output.mjs";
import { readMonthlyScoreArchive, writeMonthlyScoreArchive } from "./lib/monthly-score-archive.mjs";
import { maimaiVersion, standaloneMaimaiVersion } from "./lib/maimai-version.mjs";

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const OVERRIDES_PATH = path.join(ROOT, "src", "data", "overrides.json");
const GENERATED_PATH = path.join(ROOT, "src", "data", "generated-catalog.json");
const REJECTED_SCORES_PATH = path.join(ROOT, ".sync", "rejected-scores.json");

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const SEGA_CATALOG_URL = requiredEnvironment("SEGA_CATALOG_URL");
const SEGA_JACKET_BASE_URL = requiredEnvironment("SEGA_JACKET_BASE_URL");
const CHART_SUPPLEMENT_METADATA_URL = requiredEnvironment("CHART_SUPPLEMENT_METADATA_URL");

const chartFields = [
  ["DX", "BASIC", "dx_lev_bas"],
  ["DX", "ADVANCED", "dx_lev_adv"],
  ["DX", "EXPERT", "dx_lev_exp"],
  ["DX", "MASTER", "dx_lev_mas"],
  ["DX", "Re:MASTER", "dx_lev_remas"],
  ["STD", "BASIC", "lev_bas"],
  ["STD", "ADVANCED", "lev_adv"],
  ["STD", "EXPERT", "lev_exp"],
  ["STD", "MASTER", "lev_mas"],
  ["STD", "Re:MASTER", "lev_remas"],
];
const difficultyIndexes = new Map([
  ["BASIC", 0],
  ["ADVANCED", 1],
  ["EXPERT", 2],
  ["MASTER", 3],
  ["Re:MASTER", 4],
]);

function normalizeTitle(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizedTitles(values, canonicalTitle = "") {
  const canonical = normalizeTitle(canonicalTitle);
  return unique(values
    .map((title) => String(title).trim().toLocaleLowerCase())
    .filter((title) => title && normalizeTitle(title) !== canonical));
}

function songTitleValues(song) {
  return [
    song.titles.canonical,
    ...song.titles.kana,
    ...song.titles.romaji,
    ...song.titles.english,
    ...song.titles.aliases,
  ];
}

function overrideTitleValues(override) {
  const titles = override.titles ?? {};
  return [
    ...(titles.kana ?? []),
    ...(titles.romaji ?? []),
    ...(titles.english ?? []),
    ...(titles.aliases ?? []),
  ];
}

function createSongTitles(canonical, override) {
  const titles = override.titles ?? {};
  return {
    canonical,
    kana: normalizedTitles(titles.kana ?? [], canonical),
    romaji: normalizedTitles(titles.romaji ?? [], canonical),
    english: normalizedTitles(titles.english ?? [], canonical),
    aliases: normalizedTitles(titles.aliases ?? [], canonical),
  };
}

function fallbackId(title) {
  return `song-${createHash("sha256").update(title).digest("hex").slice(0, 12)}`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function download(url, label) {
  try {
    const { stdout } = await execFileAsync("curl", [
      "--fail",
      "--location",
      "--silent",
      "--show-error",
      "--user-agent",
      "maimai-score-gallery catalog importer",
      url,
    ], { encoding: "buffer", maxBuffer: 20 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    const details = error?.stderr?.toString().trim();
    throw new Error(`${label} download failed${details ? `: ${details}` : ""}`, { cause: error });
  }
}

async function fetchJson(url, label) {
  console.log(`Fetching ${label}: ${url}`);
  return JSON.parse((await download(url, label)).toString("utf8"));
}

async function requestedSongs() {
  const archive = await readMonthlyScoreArchive();
  const requested = new Map();
  archive.scores.forEach((score) => {
    const key = normalizeTitle(score.songTitle);
    requested.set(key, { title: score.songTitle });
  });
  return [...requested.values()];
}

function isAlreadyCataloged(title, songs) {
  const target = normalizeTitle(title);
  return songs.some((song) => songTitleValues(song)
    .some((name) => normalizeTitle(name) === target));
}

function findOfficialSong(title, officialSongs, overrides) {
  const target = normalizeTitle(title);
  return officialSongs.find((song) => {
    const override = overrides[song.title] ?? {};
    const names = [song.title, ...overrideTitleValues(override)];
    return names.some((name) => normalizeTitle(name) === target);
  });
}

function findStandaloneSong(title, songs) {
  const target = normalizeTitle(title);
  return songs.find((song) => song.matchTitles
    .some((name) => normalizeTitle(name) === target));
}

function songArtist(official, override = {}) {
  const artist = String(override.artist ?? official.artist ?? "").trim();
  if (!artist) throw new Error(`Official catalog entry is missing an artist: ${official.title}`);
  return artist;
}

function songGenre(source, override = {}) {
  const genre = String(override.genre ?? source.catcode ?? "").trim();
  if (!genre) throw new Error(`Catalog entry is missing a genre: ${source.title}`);
  return genre;
}

function songIntroduction(source, override = {}) {
  const code = override.version ?? source.version;
  if (typeof code === "object" && code !== null) return standaloneMaimaiVersion(code);
  if (code === null && source.image_url === null) return null;
  if (code === null || code === undefined || String(code).trim() === "") {
    throw new Error(`Official catalog entry is missing a version: ${source.title}`);
  }
  return maimaiVersion(code);
}

function refreshStandaloneMetadata(songs, standaloneSongs) {
  standaloneSongs.forEach((sourceSong) => {
    const song = songs.find((candidate) => isAlreadyCataloged(sourceSong.title, [candidate]));
    if (!song) return;
    const override = sourceSong.standaloneOverride;
    song.artist = songArtist(sourceSong, override);
    song.genre = songGenre(sourceSong, override);
    song.introducedIn = songIntroduction(sourceSong, override);
  });
}

function communityChartKey(title, chartType) {
  return `${normalizeTitle(title)}|${chartType}`;
}

function communityChartType(type) {
  if (type === "DX") return "DX";
  if (type === "SD" || type === "STD") return "STD";
  return null;
}

function indexCommunityCharts(songs) {
  const index = new Map();
  songs.forEach((song) => {
    const chartType = communityChartType(song.type);
    if (!chartType) return;
    const key = communityChartKey(song.title, chartType);
    const entries = index.get(key) ?? [];
    entries.push(song);
    index.set(key, entries);
  });
  return index;
}

function findCommunitySong(title, chartType, communitySongs) {
  const matches = communitySongs.get(communityChartKey(title, chartType)) ?? [];
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    console.warn(`Ambiguous supplemental chart metadata match for ${title} (${chartType}); leaving chart metadata unchanged.`);
  }
  return null;
}

function communityChartMetadata(song, index) {
  if (!song) return {};
  const chart = Array.isArray(song.charts) ? song.charts[index] : null;
  const chartConstant = Array.isArray(song.ds) && Number.isFinite(song.ds[index])
    ? song.ds[index]
    : null;
  const rawCharter = String(chart?.charter ?? "").trim();
  return {
    chartConstant,
    charter: rawCharter && rawCharter !== "-" ? rawCharter : null,
  };
}

function extractChartVersions(song, override, communitySongs) {
  const versions = new Map();
  const matches = new Map();

  chartFields.forEach(([chartType, difficulty, field]) => {
    const level = song[field];
    if (!level) return;
    const correction = override.charts?.[`${chartType}:${difficulty}`] ?? {};
    const charts = versions.get(chartType) ?? [];
    if (!matches.has(chartType)) {
      matches.set(chartType, findCommunitySong(song.title, chartType, communitySongs));
    }
    const communitySong = matches.get(chartType);
    const metadata = communityChartMetadata(communitySong, difficultyIndexes.get(difficulty));
    charts.push({
      difficulty,
      level: String(level),
      chartConstant: correction.chartConstant ?? metadata.chartConstant ?? null,
      charter: correction.charter ?? metadata.charter ?? null,
    });
    versions.set(chartType, charts);
  });

  return [...versions].map(([chartType, charts]) => ({ chartType, charts }));
}

function enrichExistingCharts(songs, communitySongs, overrides) {
  let changed = false;
  songs.forEach((song) => {
    const canonicalTitle = song.titles.canonical;
    const override = overrides[canonicalTitle] ?? {};
    song.versions.forEach((version) => {
      const communitySong = findCommunitySong(canonicalTitle, version.chartType, communitySongs);
      version.charts.forEach((chart) => {
        const correction = override.charts?.[`${version.chartType}:${chart.difficulty}`] ?? {};
        const metadata = communityChartMetadata(communitySong, difficultyIndexes.get(chart.difficulty));
        const chartConstant = correction.chartConstant ?? metadata.chartConstant ?? chart.chartConstant ?? null;
        const charter = correction.charter ?? metadata.charter ?? chart.charter ?? null;
        if (chart.chartConstant !== chartConstant || chart.charter !== charter) {
          chart.chartConstant = chartConstant;
          chart.charter = charter;
          changed = true;
        }
      });
    });
  });
  return changed;
}

function chartSlug(difficulty) {
  return difficulty.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function findChartId(score, songs) {
  const target = normalizeTitle(score.songTitle);
  const song = songs.find((entry) => songTitleValues(entry)
    .some((name) => normalizeTitle(name) === target));
  const version = song?.versions.find((entry) => entry.chartType === score.chartType);
  return version?.charts.find((chart) => chart.difficulty === score.difficulty)?.id ?? null;
}

async function linkArchivedScores(songs, unmatchedSongs) {
  const archive = await readMonthlyScoreArchive();
  let changed = false;
  const rejectedByTitle = new Map();
  const acceptedScores = [];

  archive.scores.forEach((score) => {
    const unmatched = unmatchedSongs.get(normalizeTitle(score.songTitle));
    if (unmatched) {
      const rejected = rejectedByTitle.get(unmatched.title) ?? {
        title: unmatched.title,
        reason: unmatched.reason,
        scores: [],
      };
      rejected.scores.push({ id: score.id, playedAt: score.playedAt });
      rejectedByTitle.set(unmatched.title, rejected);
      changed = true;
      return;
    }

    const chartId = findChartId(score, songs);
    if (score.chartId === chartId) {
      acceptedScores.push(score);
    } else {
      acceptedScores.push({ ...score, chartId });
      changed = true;
    }
  });

  const rejectedSongs = [...rejectedByTitle.values()]
    .sort((a, b) => a.title.localeCompare(b.title));
  const rejectedScoreCount = rejectedSongs.reduce((total, entry) => total + entry.scores.length, 0);
  await mkdir(path.dirname(REJECTED_SCORES_PATH), { recursive: true });
  await writeFile(REJECTED_SCORES_PATH, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    rejectedSongs,
  }, null, 2)}\n`);

  if (changed) {
    await writeMonthlyScoreArchive(acceptedScores);
    console.log(`Updated score-to-chart associations; rejected ${rejectedScoreCount} unknown-title play(s).`);
  }
}

function contentExtension(contentType, sourceUrl) {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("png")) return "png";
  return path.extname(new URL(sourceUrl).pathname).replace(/^\./, "") || "png";
}

async function uploadJacket(songId, sourceUrl) {
  const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing R2 configuration: ${missing.join(", ")}`);
  }

  const body = await download(sourceUrl, "Jacket");
  const extension = path.extname(new URL(sourceUrl).pathname).toLowerCase();
  const contentType = extension === ".webp" ? "image/webp" : extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 12);
  const key = `jackets/${songId}-${hash}.${contentExtension(contentType, sourceUrl)}`;

  const { HeadObjectCommand, PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  const object = { Bucket: process.env.R2_BUCKET_NAME, Key: key };
  let exists = false;

  try {
    await client.send(new HeadObjectCommand(object));
    exists = true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode !== 404 && error?.name !== "NotFound") throw error;
  }

  if (!exists) {
    await client.send(new PutObjectCommand({
      ...object,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));
    console.log(`Uploaded ${key}`);
  } else {
    console.log(`Already stored ${key}`);
  }

  return key;
}

async function main() {
  const [overrides, previous, requested] = await Promise.all([
    readJson(OVERRIDES_PATH),
    readJson(GENERATED_PATH),
    requestedSongs(),
  ]);
  const standaloneSongs = standaloneCatalogSongs(overrides);
  const titles = requested.map((entry) => entry.title);
  const unmatchedSongs = new Map();
  const newTitles = titles.filter((title) => !isAlreadyCataloged(title, previous.songs));
  const missingArtistSongs = previous.songs.filter((song) =>
    typeof song.artist !== "string" || !song.artist.trim());
  const missingSourceMetadataSongs = previous.songs.filter((song) =>
    typeof song.genre !== "string" || !song.genre.trim() || song.introducedIn === undefined);
  const backfillSongs = [...new Map(
    [...missingArtistSongs, ...missingSourceMetadataSongs].map((song) => [song.id, song]),
  ).values()];
  console.log(`Found ${newTitles.length} new song(s) and ${backfillSongs.length} catalog metadata record(s) to backfill.`);
  const [officialSongs, chartMetadataSongs] = await Promise.all([
    newTitles.length || backfillSongs.length
      ? fetchJson(SEGA_CATALOG_URL, "SEGA song catalog")
      : Promise.resolve([]),
    fetchJson(CHART_SUPPLEMENT_METADATA_URL, "supplemental chart metadata"),
  ]);
  const communitySongs = indexCommunityCharts(chartMetadataSongs);
  const songs = structuredClone(previous.songs);
  enrichExistingCharts(songs, communitySongs, overrides);
  refreshStandaloneMetadata(songs, standaloneSongs);

  backfillSongs.forEach((backfillSong) => {
    const song = songs.find((candidate) => candidate.id === backfillSong.id);
    if (!song) throw new Error(`Could not locate catalog record for metadata backfill: ${backfillSong.id}`);
    const canonicalTitle = song.titles.canonical;
    const official = findOfficialSong(canonicalTitle, officialSongs, overrides);
    const standalone = findStandaloneSong(canonicalTitle, standaloneSongs);
    const sourceSong = official ?? standalone;
    if (!sourceSong) throw new Error(`Could not backfill catalog metadata for: ${canonicalTitle}`);
    const override = official ? (overrides[official.title] ?? {}) : standalone.standaloneOverride;
    song.artist = songArtist(sourceSong, override);
    song.genre = songGenre(sourceSong, override);
    song.introducedIn = songIntroduction(sourceSong, override);
  });

  for (const requestedTitle of newTitles) {
    const official = findOfficialSong(requestedTitle, officialSongs, overrides);
    const standalone = findStandaloneSong(requestedTitle, standaloneSongs);
    const sourceSong = official ?? standalone;
    if (!sourceSong) {
      console.warn(`No official catalog match for: ${requestedTitle}`);
      const key = normalizeTitle(requestedTitle);
      unmatchedSongs.set(key, {
        title: requestedTitle,
        reason: "No matching title in the SEGA song catalog",
      });
      continue;
    }

    unmatchedSongs.delete(normalizeTitle(requestedTitle));

    const override = official ? (overrides[official.title] ?? {}) : standalone.standaloneOverride;
    const baseId = override.id ?? fallbackId(sourceSong.title);
    const jacketKey = official
      ? await uploadJacket(baseId, new URL(sourceSong.image_url, SEGA_JACKET_BASE_URL).toString())
      : (override.jacketKey ?? null);
    const versions = extractChartVersions(sourceSong, override, communitySongs).map(({ chartType, charts }) => {
      const versionId = `${baseId}-${chartType.toLowerCase()}`;
      return {
        id: versionId,
        chartType,
        charts: charts.map((chart) => ({
          id: `${versionId}-${chartSlug(chart.difficulty)}`,
          ...chart,
        })),
      };
    });

    songs.push({
      id: baseId,
      titles: createSongTitles(sourceSong.title, override),
      artist: songArtist(sourceSong, override),
      genre: songGenre(sourceSong, override),
      introducedIn: songIntroduction(sourceSong, override),
      jacketKey,
      versions,
    });

    // Be polite to the source host when synchronizing multiple new jackets.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  await enrichMissingSongTitles(songs);

  const { catalog, changed: catalogChanged } = catalogOutput(previous, songs);
  if (catalogChanged) {
    await writeFile(GENERATED_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  }
  await linkArchivedScores(catalog.songs, unmatchedSongs);
  if (catalogChanged) {
    console.log(`Wrote ${songs.length} song(s) to ${path.relative(ROOT, GENERATED_PATH)}.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
