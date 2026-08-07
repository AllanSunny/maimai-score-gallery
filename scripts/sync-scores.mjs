import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ARCHIVE_PATH = path.join(process.cwd(), "src", "data", "generated-scores.json");
const CATALOG_PATH = path.join(process.cwd(), "src", "data", "generated-catalog.json");

function normalizeTitle(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function findChartId(score, songs) {
  const target = normalizeTitle(score.songTitle);
  const song = songs.find((entry) => [entry.title, ...(entry.alternateTitles ?? [])]
    .some((name) => normalizeTitle(name) === target));
  const version = song?.versions.find((entry) => entry.chartType === score.chartType);
  return version?.charts.find((chart) => chart.difficulty === score.difficulty)?.id ?? null;
}

function scoreFingerprint(score) {
  const { id: _id, chartId: _chartId, ...publicScore } = score;
  return JSON.stringify(publicScore);
}

async function downloadJson(url) {
  const { stdout } = await execFileAsync("curl", [
    "--fail",
    "--location",
    "--silent",
    "--show-error",
    "--user-agent",
    "maimai-score-gallery score importer",
    url,
  ], { encoding: "buffer", maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(stdout.toString("utf8"));
}

async function main() {
  if (!process.env.SCORES_API_URL) throw new Error("SCORES_API_URL is required.");

  const [archive, catalog] = await Promise.all([
    readFile(ARCHIVE_PATH, "utf8").then(JSON.parse),
    readFile(CATALOG_PATH, "utf8").then(JSON.parse),
  ]);
  const feed = await downloadJson(process.env.SCORES_API_URL);
  if (!Array.isArray(feed.scores)) throw new Error("Score feed must contain a scores array.");

  const archivedScores = new Set(archive.scores.map(scoreFingerprint));
  const additions = feed.scores.filter((score) => {
    if (!score.id || archivedScores.has(scoreFingerprint(score))) return false;
    archivedScores.add(scoreFingerprint(score));
    return true;
  }).map((score) => ({ ...score, chartId: findChartId(score, catalog.songs) }));

  if (!additions.length) {
    console.log(`Score archive is current (${archive.scores.length} plays).`);
    return;
  }

  const scores = [...archive.scores, ...additions]
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  const nextArchive = { updatedAt: new Date().toISOString(), scores };
  await writeFile(ARCHIVE_PATH, `${JSON.stringify(nextArchive, null, 2)}\n`);
  console.log(`Archived ${additions.length} new play(s); ${scores.length} total.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
