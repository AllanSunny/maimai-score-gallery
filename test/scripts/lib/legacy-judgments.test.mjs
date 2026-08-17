import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLegacyCopiedCriticalPerfects } from "../../../scripts/lib/legacy-judgments.mjs";

function score(criticalPerfect = 100, perfect = 100) {
  return {
    judgments: { criticalPerfect, perfect },
    judgmentsByType: {
      break: { criticalPerfect: 10, perfect: 2 },
      tap: { criticalPerfect: 40, perfect: 40 },
      hold: { criticalPerfect: 20, perfect: 20 },
      slide: { criticalPerfect: 30, perfect: 30 },
      touch: { criticalPerfect: 10, perfect: 10 },
    },
  };
}

test("legacy normalization clears copied values but preserves break critical perfect", () => {
  const record = score();

  assert.equal(normalizeLegacyCopiedCriticalPerfects(record), true);
  assert.equal(record.judgments.criticalPerfect, null);
  assert.equal(record.judgmentsByType.break.criticalPerfect, 10);
  assert.equal(record.judgmentsByType.tap.criticalPerfect, null);
});

test("legacy normalization preserves a separately recorded overall critical perfect", () => {
  const record = score(12, 100);

  normalizeLegacyCopiedCriticalPerfects(record);

  assert.equal(record.judgments.criticalPerfect, 12);
});
