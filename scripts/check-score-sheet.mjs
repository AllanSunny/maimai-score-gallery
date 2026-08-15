import { readScoreSheet } from "./lib/sheet-scores.mjs";

const scores = await readScoreSheet();
console.log(`Direct Sheets score check passed (${scores.length} score rows).`);
