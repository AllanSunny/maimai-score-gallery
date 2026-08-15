import assert from "node:assert/strict";
import test from "node:test";
import { parseScoreRows } from "./sheet-scores.mjs";

const headers = [
  "Date / Time", "Song Title", "Chart Type", "Difficulty", "Chart Level",
  "Achievement %", "Rank", "Combo Status", "Sync Status", "Rating (At Time)",
  "Rating Change", "Notes / Location", "Critical Perfect", "Perfect", "Great",
  "Good", "Miss", "Fast", "Slow", "Critical Perfect Breaks", "Perfect Breaks",
  "Great Breaks", "Good Breaks", "Miss Breaks", "Critical Perfect Taps", "Perfect Taps",
  "Great Taps", "Good Taps", "Miss Taps", "Critical Perfect Holds", "Perfect Holds",
  "Great Holds", "Good Holds", "Miss Holds", "Critical Perfect Slides", "Perfect Slides",
  "Great Slides", "Good Slides", "Miss Slides", "Critical Perfect Touches", "Perfect Touches",
  "Great Touches", "Good Touches", "Miss Touches", "Romaji / English alternate title",
];

function scoreRow(values) {
  return headers.map((header) => values[header] ?? "");
}

test("parses a formatted score row using the spreadsheet timezone", () => {
  const scores = parseScoreRows([headers, scoreRow({
    "Date / Time": "2026-04-18 19:07:19",
    "Song Title": "Mystic Parade",
    "Chart Type": "DX",
    Difficulty: "MASTER",
    "Chart Level": "13",
    "Achievement %": "100.5079%",
    "Combo Status": "FC+",
    "Sync Status": "FS",
    "Rating (At Time)": "15,149",
    "Rating Change": "+11",
    "Critical Perfect": "",
    Perfect: "500",
    Great: "4",
    Good: "1",
    Miss: "0",
    Fast: "12",
    Slow: "3",
    "Critical Perfect Taps": "300",
    "Perfect Taps": "2",
  })], "America/New_York");

  assert.equal(scores.length, 1);
  assert.equal(scores[0].playedAt, "2026-04-18T23:07:19.000Z");
  assert.equal(scores[0].achievement, 100.5079);
  assert.equal(scores[0].rating, 15149);
  assert.equal(scores[0].ratingChange, 11);
  assert.equal(scores[0].judgments.criticalPerfect, 500);
  assert.equal(scores[0].judgmentsByType.tap.criticalPerfect, 300);
  assert.equal(scores[0].judgmentsByType.break.criticalPerfect, 0);
  assert.ok(scores[0].id);
});

test("omits a judgment breakdown when every note-type cell is blank", () => {
  const [score] = parseScoreRows([headers, scoreRow({
    "Date / Time": "2026-01-10 12:00:00",
    "Song Title": "Altale",
    "Chart Type": "STD",
    Difficulty: "MASTER",
    "Chart Level": "13+",
    "Achievement %": "0.991234",
  })], "America/New_York");

  assert.equal(score.achievement, 99.1234);
  assert.equal(score.judgmentsByType, null);
});

test("parses the US date format returned for legacy sheet rows", () => {
  const [score] = parseScoreRows([headers, scoreRow({
    "Date / Time": "11/9/2025 21:30:43",
    "Song Title": "Altale",
    "Chart Type": "STD",
    Difficulty: "MASTER",
    "Chart Level": "13+",
    "Achievement %": "99.1234%",
  })], "America/New_York");

  assert.equal(score.playedAt, "2025-11-10T02:30:43.000Z");
});
