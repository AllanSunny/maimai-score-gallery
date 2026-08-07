import { readFile } from "node:fs/promises";
import { parseGeneratedCatalog, parseScoresResponse } from "../src/data-validation.ts";

const catalog = JSON.parse(await readFile("src/data/generated-catalog.json", "utf8"));
const scores = JSON.parse(await readFile("src/data/generated-scores.json", "utf8"));

parseGeneratedCatalog(catalog);
parseScoresResponse(scores);
console.log(`Validated ${catalog.songs.length} songs and ${scores.scores.length} score records.`);
