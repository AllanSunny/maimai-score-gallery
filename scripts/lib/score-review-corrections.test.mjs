import assert from "node:assert/strict";
import test from "node:test";
import {
  applyReviewCorrections,
  manualScoreFromReview,
} from "./score-review-corrections.mjs";

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
    correctedScoreFields: {
      "Corrected Achievement %": 100.1234,
      "Corrected Combo Status": "ap",
      "Corrected Rating Change": -2,
    },
    correctedJudgments: {
      "Corrected Great": 7,
      "Corrected Miss Breaks": 3,
      "Corrected Perfect Taps": "",
    },
  });
  assert.equal(corrected.visibleTitle, "Correct Title");
  assert.equal(corrected.visibleArtist, "Correct Artist");
  assert.equal(corrected.ratingChange, -2);
  assert.equal(corrected.achievement, 100.1234);
  assert.equal(corrected.combo, "AP");
  assert.equal(corrected.judgments.great, 7);
  assert.equal(corrected.judgmentsByType.break.miss, 3);
  assert.equal(corrected.judgmentsByType.tap.perfect, 2);
  assert.equal(original.judgments.great, 1);
});

test("a complete review row creates a manual score without OCR", () => {
  const manual = manualScoreFromReview({
    correctedTitle: "Manual Song",
    correctedArtist: "Manual Artist",
    correctedScoreFields: {
      "Corrected Chart Type": "dx",
      "Corrected Difficulty": "master",
      "Corrected Achievement %": 99.5,
      "Corrected Combo Status": "fc+",
      "Corrected Sync Status": "none",
      "Corrected Rating": 15000,
      "Corrected Rating Change": 2,
      "Corrected Fast": 4,
      "Corrected Slow": 3,
    },
    correctedJudgments: {
      "Corrected Critical Perfect": 100,
      "Corrected Perfect": 10,
      "Corrected Great": 2,
      "Corrected Good": 1,
      "Corrected Miss": 0,
    },
  });
  assert.equal(manual.visibleTitle, "Manual Song");
  assert.equal(manual.chartType, "DX");
  assert.equal(manual.difficulty, "MASTER");
  assert.equal(manual.combo, "FC+");
  assert.equal(manual.judgmentsByType, null);
});

test("review corrections reject invalid judgment counts", () => {
  assert.throws(
    () => applyReviewCorrections(score(), {
      correctedJudgments: { "Corrected Great Slides": -1 },
    }),
    /Corrected Great Slides must be a non-negative integer/,
  );
});
