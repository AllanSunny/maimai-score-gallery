import assert from "node:assert/strict";
import test from "node:test";
import { applyReviewCorrections } from "./score-review-corrections.mjs";

function score() {
  const judgments = { criticalPerfect: 10, perfect: 2, great: 1, good: 0, miss: 0 };
  return {
    visibleTitle: "OCR Title",
    visibleArtist: null,
    titleTruncated: true,
    ratingChange: 1,
    judgments: { ...judgments },
    judgmentsByType: Object.fromEntries(
      ["break", "tap", "hold", "slide", "touch"].map((noteType) => [noteType, { ...judgments }]),
    ),
  };
}

test("review corrections override only populated judgment cells", () => {
  const original = score();
  const corrected = applyReviewCorrections(original, {
    correctedTitle: "Correct Title",
    correctedArtist: "Correct Artist",
    correctedRatingChange: -2,
    correctedJudgments: {
      "Corrected Great": 7,
      "Corrected Miss Breaks": 3,
      "Corrected Perfect Taps": "",
    },
  });
  assert.equal(corrected.visibleTitle, "Correct Title");
  assert.equal(corrected.visibleArtist, "Correct Artist");
  assert.equal(corrected.ratingChange, -2);
  assert.equal(corrected.judgments.great, 7);
  assert.equal(corrected.judgmentsByType.break.miss, 3);
  assert.equal(corrected.judgmentsByType.tap.perfect, 2);
  assert.equal(original.judgments.great, 1);
});

test("review corrections reject invalid judgment counts", () => {
  assert.throws(
    () => applyReviewCorrections(score(), {
      correctedJudgments: { "Corrected Great Slides": -1 },
    }),
    /Corrected Great Slides must be a non-negative integer/,
  );
});
