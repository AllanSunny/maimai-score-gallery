import assert from "node:assert/strict";
import test from "node:test";
import { parseScoreRows } from "./sheet-scores.mjs";

const headers = [
  "Date / Time", "Song Title", "Chart Type", "Difficulty", "Chart Level",
  "Achievement %", "Rank", "Combo Status", "Sync Status", "Rating",
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

test("parses a score row with a UTC timestamp", () => {
  const scores = parseScoreRows([headers, scoreRow({
    "Date / Time": "2026-04-18T23:07:19.000Z",
    "Song Title": "Mystic Parade",
    "Chart Type": "DX",
    Difficulty: "MASTER",
    "Chart Level": "13",
    "Achievement %": "100.5079%",
    "Combo Status": "FC+",
    "Sync Status": "FS",
    Rating: "15,149",
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
  })]);

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
    "Date / Time": "2026-01-10T17:00:00.000Z",
    "Song Title": "Altale",
    "Chart Type": "STD",
    Difficulty: "MASTER",
    "Chart Level": "13+",
    "Achievement %": "0.991234",
  })]);

  assert.equal(score.achievement, 99.1234);
  assert.equal(score.judgments, null);
  assert.equal(score.judgmentsByType, null);
  assert.equal(score.fast, null);
  assert.equal(score.slow, null);
});

test("rounds achievement percentages to four decimal places", () => {
  const [score] = parseScoreRows([headers, scoreRow({
    "Date / Time": "2026-05-21T22:34:15.000Z",
    "Song Title": "Monitoring",
    "Achievement %": "1.005",
  })]);

  assert.equal(score.achievement, 100.5);
});
