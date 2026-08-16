import assert from "node:assert/strict";
import test from "node:test";
import {
  firstAvailableScoreRow,
  importedLogValues,
  scoreSheetValues,
} from "./score-sheet-writer.mjs";

test("maps a score into ranges without rank, notes, or alternate titles", () => {
  const values = scoreSheetValues({
    playedAt: "2026-08-08T04:20:39.000Z",
    songTitle: "Mystic Parade",
    chartType: "DX",
    difficulty: "MASTER",
    level: "13",
    achievement: 100.7416,
    combo: "FC",
    sync: "None",
    rating: 15202,
    ratingChange: 4,
    judgments: { criticalPerfect: 500, perfect: 2, great: 1, good: 0, miss: 0 },
    judgmentsByType: null,
    fast: 23,
    slow: 6,
  });

  assert.deepEqual(values.first, [
    "2026-08-08T04:20:39.000Z", "Mystic Parade", "DX", "MASTER", "13", 1.007416,
  ]);
  assert.deepEqual(values.statuses, ["FC", "None", 15202, 4]);
  assert.equal(values.judgments.length, 32);
  assert.deepEqual(values.judgments.slice(0, 7), [500, 2, 1, 0, 0, 23, 6]);
  assert.ok(values.judgments.slice(7).every((value) => value === ""));
});

test("leaves all unavailable judgment and timing cells blank", () => {
  const values = scoreSheetValues({
    playedAt: "2026-08-08T04:20:39.000Z",
    songTitle: "Mystic Parade",
    chartType: "DX",
    difficulty: "MASTER",
    level: "13",
    achievement: 97,
    combo: "Clear",
    sync: "None",
    rating: 15202,
    ratingChange: 0,
    judgments: null,
    judgmentsByType: null,
    fast: null,
    slow: null,
  });

  assert.ok(values.judgments.every((value) => value === ""));
});

test("selects only a row whose importer-managed cells are all empty", () => {
  const partial = [];
  partial[1] = "Existing title";
  const available = [];
  available[6] = "formula";
  available[11] = "manual note";
  assert.equal(firstAvailableScoreRow([partial, available]), 3);
});

test("maps an imported score to the atomic import-log update", () => {
  assert.deepEqual(importedLogValues({
    canonicalTitle: "Mystic Parade",
    captureTime: "2026-08-08T04:20:39.000Z",
    spreadsheetRow: 42,
  }, "2026-08-15T12:00:00.000Z"), [
    "Mystic Parade",
    "2026-08-08T04:20:39.000Z",
    42,
    "IMPORTED",
    "2026-08-15T12:00:00.000Z",
    "",
  ]);
});
