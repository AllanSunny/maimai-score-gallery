import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const OVERRIDES_PATH = path.join(ROOT, "catalog", "overrides.json");
const SEED_TITLES_PATH = path.join(ROOT, "catalog", "seed-titles.json");
const GENERATED_PATH = path.join(ROOT, "src", "data", "generated-catalog.json");
const SCORES_PATH = path.join(ROOT, "src", "data", "generated-scores.json");
const ALIAS_HANDOFF_PATH = path.join(ROOT, ".sync", "song-aliases.json");
const SEGA_CATALOG_URL = process.env.SEGA_CATALOG_URL ?? "https://maimai.sega.jp/data/maimai_songs.json";
const SEGA_JACKET_BASE_URL = process.env.SEGA_JACKET_BASE_URL ?? "https://maimaidx.jp/maimai-mobile/img/Music/";

const args = process.argv.slice(2);
const sampleIndex = args.indexOf("--sample");
const sample = sampleIndex >= 0 ? args[sampleIndex + 1] : null;
const dryRun = args.includes("--dry-run");

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

function normalizeTitle(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function alternateTitles(values, canonicalTitle = "") {
  const canonical = normalizeTitle(canonicalTitle);
  return unique(values
    .map((title) => String(title).trim().toLocaleLowerCase())
    .filter((title) => title && normalizeTitle(title) !== canonical));
}

function fallbackId(title) {
  return `song-${createHash("sha256").update(title).digest("hex").slice(0, 12)}`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readOptionalJson(filePath, fallback) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
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
  if (sample) {
    if (normalizeTitle(sample) !== "tsunagite") throw new Error(`Unknown sample: ${sample}`);
    return [{ title: "系ぎて", alternateTitles: ["tsunagite"] }];
  }

  const [archive, seedTitles, aliasHandoff] = await Promise.all([
    readJson(SCORES_PATH),
    readJson(SEED_TITLES_PATH),
    readOptionalJson(ALIAS_HANDOFF_PATH, []),
  ]);
  if (!Array.isArray(archive.scores)) throw new Error("Score archive must contain a scores array.");
  if (!Array.isArray(seedTitles)) throw new Error("Catalog seed titles must be an array.");
  const requested = new Map();
  archive.scores.forEach((score) => {
    const key = normalizeTitle(score.songTitle);
    const entry = requested.get(key) ?? { title: score.songTitle, alternateTitles: [] };
    requested.set(key, entry);
  });
  aliasHandoff.forEach((handoff) => {
    const key = normalizeTitle(handoff.title);
    const entry = requested.get(key) ?? { title: handoff.title, alternateTitles: [] };
    entry.alternateTitles = alternateTitles([...entry.alternateTitles, ...(handoff.alternateTitles ?? [])], entry.title);
    requested.set(key, entry);
  });
  seedTitles.forEach((title) => {
    const key = normalizeTitle(title);
    if (!requested.has(key)) requested.set(key, { title, alternateTitles: [] });
  });
  return [...requested.values()];
}

function mergeRequestedAliases(songs, requested) {
  let changed = false;
  requested.forEach((request) => {
    const target = normalizeTitle(request.title);
    const song = songs.find((entry) => [entry.title, ...(entry.alternateTitles ?? [])]
      .some((name) => normalizeTitle(name) === target));
    if (!song) return;
    const aliases = alternateTitles([...song.alternateTitles, ...request.alternateTitles], song.title);
    if (JSON.stringify(aliases) !== JSON.stringify(song.alternateTitles)) {
      song.alternateTitles = aliases;
      changed = true;
    }
  });
  return changed;
}

function isAlreadyCataloged(title, songs) {
  const target = normalizeTitle(title);
  return songs.some((song) => [song.title, ...(song.alternateTitles ?? [])]
    .some((name) => normalizeTitle(name) === target));
}

function hasMatchingOverride(title, overrides) {
  const target = normalizeTitle(title);
  return Object.entries(overrides).some(([officialTitle, override]) =>
    [officialTitle, ...(override.alternateTitles ?? [])]
      .some((name) => normalizeTitle(name) === target));
}

function findOfficialSong(title, officialSongs, overrides) {
  const target = normalizeTitle(title);
  return officialSongs.find((song) => {
    const override = overrides[song.title] ?? {};
    const names = [song.title, ...(override.alternateTitles ?? [])];
    return names.some((name) => normalizeTitle(name) === target);
  });
}

function extractChartVersions(song, override) {
  const versions = new Map();

  chartFields.forEach(([chartType, difficulty, field]) => {
    const level = song[field];
    if (!level) return;
    const correction = override.charts?.[`${chartType}:${difficulty}`] ?? {};
    const charts = versions.get(chartType) ?? [];
    charts.push({ difficulty, level: String(level), chartConstant: correction.chartConstant ?? null });
    versions.set(chartType, charts);
  });

  return [...versions].map(([chartType, charts]) => ({ chartType, charts }));
}

function chartSlug(difficulty) {
  return difficulty.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function findChartId(score, songs) {
  const target = normalizeTitle(score.songTitle);
  const song = songs.find((entry) => [entry.title, ...(entry.alternateTitles ?? [])]
    .some((name) => normalizeTitle(name) === target));
  const version = song?.versions.find((entry) => entry.chartType === score.chartType);
  return version?.charts.find((chart) => chart.difficulty === score.difficulty)?.id ?? null;
}

async function linkArchivedScores(songs) {
  if (sample) return;
  const archive = await readJson(SCORES_PATH);
  let changed = false;
  archive.scores = archive.scores.map((score) => {
    const chartId = findChartId(score, songs);
    if (score.chartId === chartId) return score;
    changed = true;
    return { ...score, chartId };
  });
  if (changed) {
    await writeFile(SCORES_PATH, `${JSON.stringify(archive, null, 2)}\n`);
    console.log("Updated score-to-chart associations.");
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
    if (dryRun) {
      console.log(`Dry run: skipping R2 upload for ${songId}.`);
      return null;
    }
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
  const titles = requested.map((entry) => entry.title);
  const aliasesChanged = mergeRequestedAliases(previous.songs, requested);
  const unmatchedSongs = new Map((previous.unmatchedSongs ?? [])
    .map((entry) => [normalizeTitle(entry.title), entry]));
  const newTitles = titles.filter((title) => {
    if (isAlreadyCataloged(title, previous.songs)) return false;
    const wasUnmatched = unmatchedSongs.has(normalizeTitle(title));
    return !wasUnmatched || hasMatchingOverride(title, overrides);
  });
  if (!newTitles.length) {
    await linkArchivedScores(previous.songs);
    if (aliasesChanged) {
      previous.generatedAt = new Date().toISOString();
      await writeFile(GENERATED_PATH, `${JSON.stringify(previous, null, 2)}\n`);
      console.log("Updated song aliases from the score archive.");
    }
    console.log(`Song catalog is current (${previous.songs.length} songs, ${unmatchedSongs.size} unmatched).`);
    return;
  }

  console.log(`Found ${newTitles.length} new song(s).`);
  const officialSongs = await fetchJson(SEGA_CATALOG_URL, "SEGA song catalog");
  const songs = [...previous.songs];

  for (const requestedTitle of newTitles) {
    const official = findOfficialSong(requestedTitle, officialSongs, overrides);
    if (!official) {
      console.warn(`No official catalog match for: ${requestedTitle}`);
      const key = normalizeTitle(requestedTitle);
      unmatchedSongs.set(key, {
        title: requestedTitle,
        reason: "No matching title in the SEGA song catalog",
        firstSeenAt: unmatchedSongs.get(key)?.firstSeenAt ?? new Date().toISOString(),
        lastAttemptedAt: new Date().toISOString(),
      });
      continue;
    }

    unmatchedSongs.delete(normalizeTitle(requestedTitle));

    const override = overrides[official.title] ?? {};
    const requestedAliases = requested.find((entry) => normalizeTitle(entry.title) === normalizeTitle(requestedTitle))?.alternateTitles ?? [];
    const baseId = override.id ?? fallbackId(official.title);
    const sourceJacketUrl = new URL(official.image_url, SEGA_JACKET_BASE_URL).toString();
    const jacketKey = await uploadJacket(baseId, sourceJacketUrl);
    const versions = extractChartVersions(official, override).map(({ chartType, charts }) => {
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
      title: official.title,
      alternateTitles: alternateTitles([...(override.alternateTitles ?? []), ...requestedAliases], official.title),
      jacketKey,
      versions,
    });

    // Be polite to the source host when synchronizing multiple new jackets.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const catalog = {
    generatedAt: new Date().toISOString(),
    songs: songs.sort((a, b) => a.title.localeCompare(b.title)),
    unmatchedSongs: [...unmatchedSongs.values()].sort((a, b) => a.title.localeCompare(b.title)),
  };
  await writeFile(GENERATED_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  await linkArchivedScores(catalog.songs);
  console.log(`Wrote ${songs.length} song(s) to ${path.relative(ROOT, GENERATED_PATH)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
