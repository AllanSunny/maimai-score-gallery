import assert from "node:assert/strict";
import test from "node:test";
import { proposedScoreRecord } from "./score-import-record.mjs";

function judgmentSet(overrides = {}) {
  return { criticalPerfect: 10, perfect: 2, great: 1, good: 0, miss: 0, ...overrides };
}

function validInput() {
  return {
    capturedAt: "2026-08-15T16:35:20.000Z",
    resolution: {
      canonicalTitle: "Mystic Parade",
      chart: { chartType: "DX", difficulty: "MASTER", level: "13+" },
    },
    ocr: {
      achievement: 100.5,
      combo: "FC",
      sync: "None",
      rating: 16000,
      ratingChange: 4,
      judgments: judgmentSet({ criticalPerfect: 50, perfect: 10, great: 5 }),
      judgmentsByType: {
        break: judgmentSet(),
        tap: judgmentSet(),
        hold: judgmentSet(),
        slide: judgmentSet(),
        touch: judgmentSet(),
      },
      fast: 3,
      slow: 2,
    },
  };
}

test("proposed score uses canonical catalog identity and chart level", () => {
  const record = proposedScoreRecord(validInput());
  assert.equal(record.songTitle, "Mystic Parade");
  assert.equal(record.level, "13+");
  assert.equal(record.playedAt, "2026-08-15T16:35:20.000Z");
});

test("proposed score falls back from missing critical perfect to perfect", () => {
  const input = validInput();
  input.ocr.judgments.criticalPerfect = null;
  Object.values(input.ocr.judgmentsByType).forEach((set) => { set.criticalPerfect = null; });
  const record = proposedScoreRecord(input);
  assert.equal(record.judgments.criticalPerfect, 10);
  assert.ok(Object.values(record.judgmentsByType).every((set) => set.criticalPerfect === 2));
});

test("proposed score rejects inconsistent judgment totals", () => {
  const input = validInput();
  input.ocr.judgments.great = 6;
  assert.throws(
    () => proposedScoreRecord(input),
    (error) => error.code === "JUDGMENT_MISMATCH" && error.judgment === "great",
  );
});

test("proposed score defaults missing change and timing counts to zero", () => {
  const input = validInput();
  input.ocr.ratingChange = null;
  input.ocr.fast = null;
  input.ocr.slow = null;
  const record = proposedScoreRecord(input);
  assert.equal(record.ratingChange, 0);
  assert.equal(record.fast, 0);
  assert.equal(record.slow, 0);
});
