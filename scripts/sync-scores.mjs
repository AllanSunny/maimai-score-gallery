import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { reconcileScoreArchive } from "./lib/score-archive.mjs";
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

  const reconciliation = reconcileScoreArchive(
    archive.scores,
    feed.scores,
    (score) => storedScore(score, findChartId(score, catalog.songs)),
  );
  if (!reconciliation.changed) {
    console.log(`Score archive is current (${archive.scores.length} plays).`);
    return;
  }

  const nextArchive = { updatedAt: new Date().toISOString(), scores: reconciliation.scores };
  await writeFile(ARCHIVE_PATH, `${JSON.stringify(nextArchive, null, 2)}\n`);
  console.log(
    `Archived ${reconciliation.added} new play(s), updated ${reconciliation.updated}, `
    + `removed ${reconciliation.duplicatesRemoved} duplicate(s); ${reconciliation.scores.length} total.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
