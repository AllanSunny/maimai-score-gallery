import assert from "node:assert/strict";
import test from "node:test";
import { scoreSheetValues } from "./score-sheet-writer.mjs";

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
  }, "America/New_York");

  assert.deepEqual(values.first, [
    "2026-08-08 00:20:39", "Mystic Parade", "DX", "MASTER", "13", 1.007416,
  ]);
  assert.deepEqual(values.statuses, ["FC", "None", 15202, 4]);
  assert.equal(values.judgments.length, 32);
  assert.deepEqual(values.judgments.slice(0, 7), [500, 2, 1, 0, 0, 23, 6]);
  assert.ok(values.judgments.slice(7).every((value) => value === ""));
});
