import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readScoreSheet } from "./lib/sheet-scores.mjs";

const ARCHIVE_PATH = path.join(process.cwd(), "src", "data", "generated-scores.json");
const CATALOG_PATH = path.join(process.cwd(), "src", "data", "generated-catalog.json");
const ALIAS_HANDOFF_PATH = path.join(process.cwd(), ".sync", "song-aliases.json");

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

function scoreFingerprint(score) {
  const {
    id: _id,
    chartId: _chartId,
    alternateTitles: _alternateTitles,
    judgmentsByType: _judgmentsByType,
    rank: _rank,
    ...publicScore
  } = score;
  return JSON.stringify(publicScore);
}

function storedScore(score, chartId) {
  const { alternateTitles: _alternateTitles, rank: _rank, ...record } = score;
  return { ...record, chartId, judgmentsByType: score.judgmentsByType ?? null };
}

async function main() {
  const [archive, catalog, sheetScores] = await Promise.all([
    readFile(ARCHIVE_PATH, "utf8").then(JSON.parse),
    readFile(CATALOG_PATH, "utf8").then(JSON.parse),
    readScoreSheet(),
  ]);
  const feed = { scores: sheetScores };

  await mkdir(path.dirname(ALIAS_HANDOFF_PATH), { recursive: true });
  // Title metadata now belongs to the song catalog and will arrive through
  // the image importer's typed metadata handoff rather than score records.
  await writeFile(ALIAS_HANDOFF_PATH, "[]\n");

  const archivedByFingerprint = new Map(archive.scores.map((score, index) => [scoreFingerprint(score), index]));
  const additions = [];
  let metadataChanged = false;

  archive.scores = archive.scores.map((score) => {
    if (!("rank" in score)) return score;
    const { rank: _rank, ...record } = score;
    metadataChanged = true;
    return record;
  });

  feed.scores.forEach((score) => {
    if (!score.id) return;
    const fingerprint = scoreFingerprint(score);
    const existingIndex = archivedByFingerprint.get(fingerprint);
    if (existingIndex !== undefined) {
      const archivedCount = archive.scores.length;
      const existing = existingIndex < archivedCount
        ? archive.scores[existingIndex]
        : additions[existingIndex - archivedCount];
      const judgmentsByType = score.judgmentsByType ?? existing.judgmentsByType ?? null;
      if (
        JSON.stringify(judgmentsByType) !== JSON.stringify(existing.judgmentsByType ?? null)
      ) {
        const updated = { ...existing, judgmentsByType };
        if (existingIndex < archivedCount) archive.scores[existingIndex] = updated;
        else additions[existingIndex - archivedCount] = updated;
        metadataChanged = true;
      }
      return;
    }
    archivedByFingerprint.set(fingerprint, archive.scores.length + additions.length);
    additions.push(storedScore(score, findChartId(score, catalog.songs)));
  });

  if (!additions.length && !metadataChanged) {
    console.log(`Score archive is current (${archive.scores.length} plays).`);
    return;
  }

  const scores = [...archive.scores, ...additions]
    .sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  const nextArchive = { updatedAt: new Date().toISOString(), scores };
  await writeFile(ARCHIVE_PATH, `${JSON.stringify(nextArchive, null, 2)}\n`);
  console.log(`Archived ${additions.length} new play(s); updated alternate titles; ${scores.length} total.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
