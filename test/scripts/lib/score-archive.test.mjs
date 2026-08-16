import assert from "node:assert/strict";
import test from "node:test";
import { reconcileScoreArchive } from "../../../scripts/lib/score-archive.mjs";

function score(overrides = {}) {
  return {
    id: "score-id",
    playedAt: "2025-12-31T22:46:59.000Z",
    songTitle: "Halcyon",
    chartType: "DX",
    difficulty: "MASTER",
    achievement: 97.2244,
    combo: "Clear",
    sync: "FS",
    ...overrides,
  };
}

test("archive reconciliation replaces mutable score fields instead of appending a play", () => {
  const archived = score();
  const corrected = score({ sync: "Sync" });
  const result = reconcileScoreArchive([archived], [corrected], (value) => value);
  assert.equal(result.added, 0);
  assert.equal(result.updated, 1);
  assert.equal(result.scores.length, 1);
  assert.equal(result.scores[0].sync, "Sync");
});

test("archive reconciliation preserves distinct achievements with colliding timestamps", () => {
  const first = score({ achievement: 100.4 });
  const second = score({ id: "second", achievement: 100.4022 });
  const result = reconcileScoreArchive([first, second], [], (value) => value);
  assert.equal(result.changed, false);
  assert.equal(result.scores.length, 2);
});

test("archive reconciliation preserves historical plays absent from the sheet", () => {
  const result = reconcileScoreArchive([score()], [], (value) => value);
  assert.equal(result.changed, false);
  assert.equal(result.scores.length, 1);
});

test("archive reconciliation collapses duplicate play identities", () => {
  const result = reconcileScoreArchive([score(), score({ id: "duplicate" })], [], (value) => value);
  assert.equal(result.duplicatesRemoved, 1);
  assert.equal(result.scores.length, 1);
});
