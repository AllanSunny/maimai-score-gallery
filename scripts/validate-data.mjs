import { readFile } from "node:fs/promises";
import { readMonthlyScoreArchive } from "./lib/monthly-score-archive.mjs";
import { parseGeneratedCatalog, parseScoreChunk } from "../src/utils/data-validation.ts";

const catalog = JSON.parse(await readFile("src/data/generated-catalog.json", "utf8"));
const archive = await readMonthlyScoreArchive();

parseGeneratedCatalog(catalog);
for (const name of archive.files) {
  parseScoreChunk(JSON.parse(await readFile(`src/data/scores/${name}`, "utf8")));
}
console.log(`Validated ${catalog.songs.length} songs and ${archive.scores.length} score records across ${archive.files.length} month(s).`);
