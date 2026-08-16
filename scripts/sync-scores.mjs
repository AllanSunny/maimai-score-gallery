import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { scoreFingerprint as scoreIdentityFingerprint } from "./lib/import-fingerprints.mjs";
import { readScoreSheet } from "./lib/sheet-scores.mjs";

const ARCHIVE_PATH = path.join(process.cwd(), "src", "data", "generated-scores.json");
const CATALOG_PATH = path.join(process.cwd(), "src", "data", "generated-catalog.json");

function normalizeTitle(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function songTitleValues(song) {
  const titles = song.titles;
  return [
    titles.canonical,
    ...titles.kana,
    ...titles.romaji,
    ...titles.english,
    ...titles.aliases,
  ];
}

function findChartId(score, songs) {
  const target = normalizeTitle(score.songTitle);
  const song = songs.find((entry) => songTitleValues(entry)
    .some((name) => normalizeTitle(name) === target));
  const version = song?.versions.find((entry) => entry.chartType === score.chartType);
  return version?.charts.find((chart) => chart.difficulty === score.difficulty)?.id ?? null;
}

function storedScoreFingerprint(score) {
  const {
    id: _id,
    chartId: _chartId,
    judgmentsByType: _judgmentsByType,
    ...publicScore
  } = score;
  return JSON.stringify({
    ...publicScore,
    achievement: Number(Number(publicScore.achievement).toFixed(4)),
  });
}

function storedScore(score, chartId) {
  return {
    ...score,
    achievement: Number(Number(score.achievement).toFixed(4)),
    chartId,
    judgmentsByType: score.judgmentsByType ?? null,
  };
}

async function main() {
  const [archive, catalog, sheetScores] = await Promise.all([
    readFile(ARCHIVE_PATH, "utf8").then(JSON.parse),
    readFile(CATALOG_PATH, "utf8").then(JSON.parse),
    readScoreSheet(),
  ]);
  const feed = { scores: sheetScores };

  const uniqueArchivedScores = [];
  const archivedIdentities = new Set();
  archive.scores.forEach((score) => {
    const identity = scoreIdentityFingerprint(score);
    if (archivedIdentities.has(identity)) return;
    archivedIdentities.add(identity);
    uniqueArchivedScores.push(score);
  });
  const archivedByFingerprint = new Map(uniqueArchivedScores
    .map((score, index) => [storedScoreFingerprint(score), index]));
  const additions = [];

  feed.scores.forEach((score) => {
    if (!score.id) return;
    const fingerprint = storedScoreFingerprint(score);
    const existingIndex = archivedByFingerprint.get(fingerprint);
    if (existingIndex !== undefined) return;
    archivedByFingerprint.set(fingerprint, uniqueArchivedScores.length + additions.length);
    additions.push(storedScore(score, findChartId(score, catalog.songs)));
  });

  const duplicatesRemoved = archive.scores.length - uniqueArchivedScores.length;
  if (!additions.length && duplicatesRemoved === 0) {
    console.log(`Score archive is current (${archive.scores.length} plays).`);
    return;
  }

  const scores = [...uniqueArchivedScores, ...additions]
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  const nextArchive = { updatedAt: new Date().toISOString(), scores };
  await writeFile(ARCHIVE_PATH, `${JSON.stringify(nextArchive, null, 2)}\n`);
  console.log(`Archived ${additions.length} new play(s), removed ${duplicatesRemoved} duplicate(s); ${scores.length} total.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
