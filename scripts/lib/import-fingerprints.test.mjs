import assert from "node:assert/strict";
import test from "node:test";
import { scoreFingerprint, sourceFingerprint } from "./import-fingerprints.mjs";

test("source fingerprint is stable and content-sensitive", () => {
  assert.equal(sourceFingerprint(Buffer.from("same")), sourceFingerprint(Buffer.from("same")));
  assert.notEqual(sourceFingerprint(Buffer.from("same")), sourceFingerprint(Buffer.from("different")));
});

test("score fingerprint ignores non-identity judgment details", () => {
  const score = {
    playedAt: "2026-07-25T05:34:16.000Z",
    songTitle: "愛♡スクリ～ム！",
    chartType: "DX",
    difficulty: "MASTER",
    achievement: 100.9767,
    judgments: { great: 0 },
  };
  assert.equal(scoreFingerprint(score), scoreFingerprint({ ...score, judgments: { great: 1 } }));
  assert.notEqual(scoreFingerprint(score), scoreFingerprint({ ...score, achievement: 100.9 }));
});
