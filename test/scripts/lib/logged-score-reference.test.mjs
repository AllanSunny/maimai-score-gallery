import assert from "node:assert/strict";
import test from "node:test";
import { resolveLiveScoreReference } from "../../../scripts/lib/logged-score-reference.mjs";

test("logged score references use the current live row instead of the stored row", () => {
  const live = new Map([[
    "fingerprint",
    { canonicalTitle: "Halcyon", captureTime: "2025-12-31T22:46:59.000Z", spreadsheetRow: 480 },
  ]]);
  const resolved = resolveLiveScoreReference({
    driveFileId: "drive-file",
    scoreFingerprint: "fingerprint",
    spreadsheetRow: 482,
  }, live);
  assert.equal(resolved.spreadsheetRow, 480);
  assert.equal(resolved.driveFileId, "drive-file");
});

test("logged score references do not fall back to stale row numbers", () => {
  const logged = { scoreFingerprint: "deleted-score", spreadsheetRow: 482 };
  assert.equal(resolveLiveScoreReference(logged, new Map()), null);
  assert.equal(resolveLiveScoreReference({ spreadsheetRow: 482 }, new Map()), null);
});
