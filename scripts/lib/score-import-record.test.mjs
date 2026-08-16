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

test("rounds imported achievements to four decimal places", () => {
  const input = validInput();
  input.ocr.achievement = 100.49999999999999;

  assert.equal(proposedScoreRecord(input).achievement, 100.5);
});

test("proposed score falls back from missing critical perfect to perfect", () => {
  const input = validInput();
  input.ocr.judgments.criticalPerfect = null;
  Object.values(input.ocr.judgmentsByType).forEach((set) => { set.criticalPerfect = null; });
  const record = proposedScoreRecord(input);
  assert.equal(record.judgments.criticalPerfect, 10);
  assert.ok(Object.values(record.judgmentsByType).every((set) => set.criticalPerfect === 2));
});

test("legacy judgment layouts include break critical perfect in the overall perfect total", () => {
  const input = validInput();
  input.ocr.judgments.criticalPerfect = null;
  input.ocr.judgments.perfect = 20;
  ["tap", "hold", "slide", "touch"].forEach((noteType) => {
    input.ocr.judgmentsByType[noteType].criticalPerfect = null;
  });

  const record = proposedScoreRecord(input);
  assert.equal(record.judgments.perfect, 20);
  assert.equal(record.judgmentsByType.break.criticalPerfect, 10);
  assert.equal(record.judgmentsByType.tap.criticalPerfect, 2);
});

test("proposed score rejects inconsistent judgment totals", () => {
  const input = validInput();
  input.ocr.judgments.great = 6;
  assert.throws(
    () => proposedScoreRecord(input),
    (error) => error.code === "JUDGMENT_MISMATCH" && error.judgment === "great",
  );
});

test("proposed score derives obscured overall totals from note-type counts", () => {
  const input = validInput();
  input.ocr.judgments = {
    criticalPerfect: null,
    perfect: null,
    great: null,
    good: null,
    miss: null,
  };
  const record = proposedScoreRecord(input);
  assert.deepEqual(record.judgments, {
    criticalPerfect: 50,
    perfect: 10,
    great: 5,
    good: 0,
    miss: 0,
  });
});

test("proposed score accepts overall totals when the note-type breakdown is unavailable", () => {
  const input = validInput();
  input.ocr.judgmentsByType = null;
  const record = proposedScoreRecord(input);
  assert.deepEqual(record.judgments, input.ocr.judgments);
  assert.equal(record.judgmentsByType, null);
});

test("totals-only scores fall back from missing critical perfect to perfect", () => {
  const input = validInput();
  input.ocr.judgmentsByType = null;
  input.ocr.judgments.criticalPerfect = null;
  const record = proposedScoreRecord(input);
  assert.equal(record.judgments.criticalPerfect, record.judgments.perfect);
});

test("proposed score requires readable totals when the note-type breakdown is unavailable", () => {
  const input = validInput();
  input.ocr.judgmentsByType = null;
  input.ocr.judgments.great = null;
  assert.throws(
    () => proposedScoreRecord(input),
    /judgments.great is unreadable and cannot be derived without a note-type breakdown/,
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
