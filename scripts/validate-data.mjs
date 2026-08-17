import { readFile } from "node:fs/promises";
import { buildChartSummaries } from "./lib/chart-summaries.mjs";
import { maimaiVersionName } from "./lib/maimai-version.mjs";
import { readMonthlyScoreArchive } from "./lib/monthly-score-archive.mjs";
import { parseChartSummaries, parseGeneratedCatalog, parseScoreChunk } from "../src/utils/data-validation.ts";

const catalog = JSON.parse(await readFile("src/data/generated-catalog.json", "utf8"));
const archive = await readMonthlyScoreArchive();
const summaries = JSON.parse(await readFile("src/data/scores/chart-summaries.json", "utf8"));

parseGeneratedCatalog(catalog);
catalog.songs.forEach((song) => {
  if (song.introducedIn?.code
    && maimaiVersionName(song.introducedIn.code) !== song.introducedIn.name) {
    throw new Error(`${song.id}.introducedIn name does not match its SEGA version code.`);
  }
});
for (const name of archive.files) {
  parseScoreChunk(JSON.parse(await readFile(`src/data/scores/${name}`, "utf8")));
}
parseChartSummaries(summaries);
if (JSON.stringify(summaries.charts) !== JSON.stringify(buildChartSummaries(archive.scores))) {
  throw new Error("Chart summaries do not match the monthly score archive.");
}
console.log(`Validated ${catalog.songs.length} songs, ${archive.scores.length} score records across ${archive.files.length} month(s), and ${Object.keys(summaries.charts).length} chart summaries.`);
