import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const OVERRIDES_PATH = path.join(ROOT, "catalog", "overrides.json");
const GENERATED_PATH = path.join(ROOT, "src", "data", "generated-catalog.json");
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

async function requestedTitles() {
  if (sample) {
    if (normalizeTitle(sample) !== "tsunagite") throw new Error(`Unknown sample: ${sample}`);
    return ["系ぎて"];
  }

  if (!process.env.SCORES_API_URL) throw new Error("SCORES_API_URL is required when --sample is not used.");
  const response = await fetchJson(process.env.SCORES_API_URL, "score feed");
  if (!Array.isArray(response.scores)) throw new Error("Score feed must return an object containing a scores array.");
  return unique(response.scores.map((score) => score.songTitle));
}

function findOfficialSong(title, officialSongs, overrides) {
  const target = normalizeTitle(title);
  return officialSongs.find((song) => {
    const override = overrides[song.title] ?? {};
    const names = [song.title, ...(override.alternateTitles ?? [])];
    return names.some((name) => normalizeTitle(name) === target);
  });
}

function extractCharts(song, override) {
  return chartFields.flatMap(([chartType, difficulty, field]) => {
    const level = song[field];
    if (!level) return [];
    const correction = override.charts?.[`${chartType}:${difficulty}`] ?? {};
    return [{ chartType, difficulty, level: String(level), chartConstant: correction.chartConstant ?? null }];
  });
}

function contentExtension(contentType, sourceUrl) {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("png")) return "png";
  return path.extname(new URL(sourceUrl).pathname).replace(/^\./, "") || "png";
}

async function uploadJacket(songId, sourceUrl) {
  const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"];
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

  return `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

async function main() {
  const [overrides, previous, titles, officialSongs] = await Promise.all([
    readJson(OVERRIDES_PATH),
    readJson(GENERATED_PATH),
    requestedTitles(),
    fetchJson(SEGA_CATALOG_URL, "SEGA song catalog"),
  ]);
  const previousById = new Map(previous.songs.map((song) => [song.id, song]));
  const songs = [];

  for (const requestedTitle of titles) {
    const official = findOfficialSong(requestedTitle, officialSongs, overrides);
    if (!official) {
      console.warn(`No official catalog match for: ${requestedTitle}`);
      continue;
    }

    const override = overrides[official.title] ?? {};
    const id = override.id ?? fallbackId(official.title);
    const sourceJacketUrl = new URL(official.image_url, SEGA_JACKET_BASE_URL).toString();
    const uploadedJacketUrl = await uploadJacket(id, sourceJacketUrl);
    const previousSong = previousById.get(id);

    songs.push({
      id,
      title: official.title,
      alternateTitles: unique(override.alternateTitles ?? []),
      jacketUrl: uploadedJacketUrl ?? previousSong?.jacketUrl ?? null,
      charts: extractCharts(official, override),
    });

    // Be polite to the source host when synchronizing multiple new jackets.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const catalog = { generatedAt: new Date().toISOString(), songs: songs.sort((a, b) => a.title.localeCompare(b.title)) };
  await writeFile(GENERATED_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Wrote ${songs.length} song(s) to ${path.relative(ROOT, GENERATED_PATH)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
